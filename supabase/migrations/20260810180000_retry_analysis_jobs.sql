-- Fourth Phase 4 processing increment: complete failed attempts, schedule
-- deterministic retries, and dead-letter terminal or exhausted jobs.

ALTER TABLE public.analysis_job_attempts
ADD COLUMN retry_available_at TIMESTAMPTZ;

ALTER TABLE public.analysis_job_attempts
DROP CONSTRAINT analysis_job_attempt_completion_shape;

ALTER TABLE public.analysis_job_attempts
ADD CONSTRAINT analysis_job_attempt_completion_shape
CHECK (
    (
        outcome IS NULL
        AND completed_at IS NULL
        AND failure_category IS NULL
        AND result_fingerprint IS NULL
        AND duration_milliseconds IS NULL
        AND retry_available_at IS NULL
    )
    OR (
        outcome = 'succeeded'
        AND completed_at IS NOT NULL
        AND failure_category IS NULL
        AND result_fingerprint IS NOT NULL
        AND duration_milliseconds IS NOT NULL
        AND retry_available_at IS NULL
    )
    OR (
        outcome = 'terminal_failure'
        AND completed_at IS NOT NULL
        AND failure_category IS NOT NULL
        AND result_fingerprint IS NULL
        AND duration_milliseconds IS NOT NULL
        AND retry_available_at IS NULL
    )
    OR (
        outcome = 'retryable_failure'
        AND completed_at IS NOT NULL
        AND failure_category IS NOT NULL
        AND result_fingerprint IS NULL
        AND duration_milliseconds IS NOT NULL
    )
);

ALTER TABLE public.analysis_run_lifecycle_events
DROP CONSTRAINT analysis_run_lifecycle_state_supported;

ALTER TABLE public.analysis_run_lifecycle_events
ADD CONSTRAINT analysis_run_lifecycle_state_supported
CHECK (state IN ('created', 'queued', 'running', 'succeeded', 'failed')),
ADD CONSTRAINT analysis_run_lifecycle_failed_shape
CHECK (
    state <> 'failed'
    OR (
        failure_category IS NOT NULL
        AND job_id IS NOT NULL
        AND attempt_id IS NOT NULL
    )
);

CREATE UNIQUE INDEX analysis_run_lifecycle_failed_unique
ON public.analysis_run_lifecycle_events (analysis_run_id)
WHERE state = 'failed';

CREATE FUNCTION private.analysis_job_retry_delay_seconds(
    p_job_id UUID,
    p_attempt_number INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
    base_seconds INTEGER;
    maximum_jitter INTEGER;
    jitter INTEGER;
BEGIN
    IF p_job_id IS NULL OR p_attempt_number IS NULL
        OR p_attempt_number NOT BETWEEN 1 AND 5
    THEN
        RAISE EXCEPTION 'Analysis retry identity is invalid.'
            USING ERRCODE = '22023';
    END IF;

    base_seconds := least(5 * (1 << (p_attempt_number - 1)), 300);
    maximum_jitter := floor(base_seconds * 0.2);
    jitter := (
        hashtextextended(p_job_id::TEXT || ':' || p_attempt_number::TEXT, 0)
        & 2147483647
    ) % (maximum_jitter + 1);

    RETURN base_seconds + jitter;
END;
$$;

CREATE FUNCTION public.complete_analysis_job_failure(
    p_job_id UUID,
    p_attempt_id UUID,
    p_lease_token UUID,
    p_failure_category TEXT,
    p_retryable BOOLEAN,
    p_duration_milliseconds INTEGER
)
RETURNS TABLE (
    analysis_job_id UUID,
    analysis_run_id UUID,
    attempt_number INTEGER,
    completion_outcome TEXT,
    failure_category TEXT,
    next_available_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    operation_time TIMESTAMPTZ := clock_timestamp();
    leased_job public.analysis_jobs%ROWTYPE;
    active_attempt public.analysis_job_attempts%ROWTYPE;
    expected_attempt_outcome TEXT;
    retry_at TIMESTAMPTZ;
    terminal_failure BOOLEAN;
    next_sequence BIGINT;
BEGIN
    IF p_failure_category IS NULL
        OR p_failure_category !~ '^[a-z0-9._-]{1,64}$'
    THEN
        RAISE EXCEPTION 'Analysis failure category is invalid.'
            USING ERRCODE = '22023';
    END IF;

    IF p_retryable IS NULL THEN
        RAISE EXCEPTION 'Analysis failure retry classification is invalid.'
            USING ERRCODE = '22023';
    END IF;

    IF p_duration_milliseconds IS NULL
        OR p_duration_milliseconds NOT BETWEEN 0 AND 86400000
    THEN
        RAISE EXCEPTION 'Analysis attempt duration is invalid.'
            USING ERRCODE = '22023';
    END IF;

    SELECT job.*
    INTO leased_job
    FROM public.analysis_jobs AS job
    WHERE job.analysis_job_id = p_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Analysis job lease is stale.'
            USING ERRCODE = 'P0003';
    END IF;

    SELECT attempt.*
    INTO active_attempt
    FROM public.analysis_job_attempts AS attempt
    WHERE attempt.analysis_job_attempt_id = p_attempt_id
      AND attempt.analysis_job_id = p_job_id
      AND attempt.lease_token = p_lease_token;

    expected_attempt_outcome := CASE
        WHEN p_retryable THEN 'retryable_failure'
        ELSE 'terminal_failure'
    END;

    IF FOUND AND active_attempt.completed_at IS NOT NULL THEN
        IF active_attempt.outcome = expected_attempt_outcome
            AND active_attempt.failure_category = p_failure_category
            AND active_attempt.duration_milliseconds = p_duration_milliseconds
            AND (
                active_attempt.retry_available_at IS NOT NULL
                OR leased_job.terminal_outcome = 'failed'
            )
        THEN
            RETURN QUERY SELECT
                leased_job.analysis_job_id,
                leased_job.analysis_run_id,
                active_attempt.attempt_number,
                CASE
                    WHEN active_attempt.retry_available_at IS NULL
                    THEN 'dead_lettered'
                    ELSE 'retry_scheduled'
                END,
                active_attempt.failure_category,
                active_attempt.retry_available_at;
            RETURN;
        END IF;

        RAISE EXCEPTION 'Analysis job lease is stale.'
            USING ERRCODE = 'P0003';
    END IF;

    IF NOT FOUND
        OR leased_job.terminal_outcome IS NOT NULL
        OR leased_job.lease_token IS DISTINCT FROM p_lease_token
        OR leased_job.lease_expires_at <= operation_time
        OR active_attempt.outcome IS NOT NULL
    THEN
        RAISE EXCEPTION 'Analysis job lease is stale.'
            USING ERRCODE = 'P0003';
    END IF;

    terminal_failure := NOT p_retryable
        OR leased_job.attempt_count >= leased_job.max_attempts;

    IF NOT terminal_failure THEN
        retry_at := operation_time + make_interval(
            secs => private.analysis_job_retry_delay_seconds(
                leased_job.analysis_job_id,
                active_attempt.attempt_number
            )
        );
    END IF;

    UPDATE public.analysis_job_attempts
    SET outcome = expected_attempt_outcome,
        failure_category = p_failure_category,
        duration_milliseconds = p_duration_milliseconds,
        retry_available_at = retry_at,
        completed_at = operation_time
    WHERE analysis_job_attempt_id = active_attempt.analysis_job_attempt_id;

    IF terminal_failure THEN
        UPDATE public.analysis_jobs
        SET terminal_outcome = 'failed',
            last_failure_category = p_failure_category,
            completed_at = operation_time,
            lease_owner = NULL,
            lease_token = NULL,
            lease_expires_at = NULL,
            updated_at = operation_time
        WHERE analysis_jobs.analysis_job_id = leased_job.analysis_job_id;
    ELSE
        UPDATE public.analysis_jobs
        SET available_at = retry_at,
            last_failure_category = p_failure_category,
            lease_owner = NULL,
            lease_token = NULL,
            lease_expires_at = NULL,
            updated_at = operation_time
        WHERE analysis_jobs.analysis_job_id = leased_job.analysis_job_id;
    END IF;

    SELECT coalesce(max(event.sequence_number), 0) + 1
    INTO next_sequence
    FROM public.analysis_run_lifecycle_events AS event
    WHERE event.analysis_run_id = leased_job.analysis_run_id;

    INSERT INTO public.analysis_run_lifecycle_events (
        analysis_run_id,
        sequence_number,
        state,
        failure_category,
        job_id,
        attempt_id,
        occurred_at
    )
    VALUES (
        leased_job.analysis_run_id,
        next_sequence,
        CASE WHEN terminal_failure THEN 'failed' ELSE 'queued' END,
        CASE WHEN terminal_failure THEN p_failure_category ELSE NULL END,
        leased_job.analysis_job_id,
        active_attempt.analysis_job_attempt_id,
        operation_time
    );

    RETURN QUERY SELECT
        leased_job.analysis_job_id,
        leased_job.analysis_run_id,
        active_attempt.attempt_number,
        CASE
            WHEN terminal_failure THEN 'dead_lettered'
            ELSE 'retry_scheduled'
        END,
        p_failure_category,
        retry_at;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_analysis_job_failure(
    UUID, UUID, UUID, TEXT, BOOLEAN, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_analysis_job_failure(
    UUID, UUID, UUID, TEXT, BOOLEAN, INTEGER
) TO service_role;
REVOKE ALL ON FUNCTION private.analysis_job_retry_delay_seconds(UUID, INTEGER)
FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION private.analysis_job_retry_delay_seconds(UUID, INTEGER) IS
    'Returns the deterministic bounded exponential retry delay for one Analysis job attempt.';
COMMENT ON FUNCTION public.complete_analysis_job_failure(
    UUID, UUID, UUID, TEXT, BOOLEAN, INTEGER
) IS
    'Lease-fenced, replay-safe failed completion that schedules a retry or atomically dead-letters the job and run.';
