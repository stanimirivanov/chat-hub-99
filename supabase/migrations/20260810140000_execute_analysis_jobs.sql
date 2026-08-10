-- Third Phase 4 processing increment: lease and deterministically complete one
-- Analysis job. Retry scheduling and terminal failure remain later work.

ALTER TABLE public.analysis_job_attempts
ALTER COLUMN processor_version SET NOT NULL,
ADD COLUMN result_fingerprint TEXT
    CONSTRAINT analysis_job_attempt_result_fingerprint_valid
    CHECK (
        result_fingerprint IS NULL
        OR (
            length(result_fingerprint) BETWEEN 1 AND 256
            AND result_fingerprint !~ E'[\\r\\n]'
        )
    ),
ADD COLUMN duration_milliseconds INTEGER
    CONSTRAINT analysis_job_attempt_duration_valid
    CHECK (duration_milliseconds BETWEEN 0 AND 86400000);

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
    )
    OR (
        outcome = 'succeeded'
        AND completed_at IS NOT NULL
        AND failure_category IS NULL
        AND result_fingerprint IS NOT NULL
        AND duration_milliseconds IS NOT NULL
    )
    OR (
        outcome IN ('retryable_failure', 'terminal_failure')
        AND completed_at IS NOT NULL
        AND failure_category IS NOT NULL
        AND result_fingerprint IS NULL
        AND duration_milliseconds IS NOT NULL
    )
);

CREATE FUNCTION private.reject_completed_analysis_job_attempt_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' OR OLD.completed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Completed Analysis job attempts are immutable.'
            USING ERRCODE = '55000';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER completed_analysis_job_attempts_are_immutable
BEFORE UPDATE OR DELETE ON public.analysis_job_attempts
FOR EACH ROW
EXECUTE FUNCTION private.reject_completed_analysis_job_attempt_mutation();

ALTER TABLE public.analysis_run_lifecycle_events
DROP CONSTRAINT analysis_run_lifecycle_state_supported;

ALTER TABLE public.analysis_run_lifecycle_events
ADD CONSTRAINT analysis_run_lifecycle_state_supported
CHECK (state IN ('created', 'queued', 'running', 'succeeded')),
ADD CONSTRAINT analysis_run_lifecycle_running_shape
CHECK (
    state <> 'running'
    OR (
        failure_category IS NULL
        AND job_id IS NOT NULL
        AND attempt_id IS NOT NULL
    )
),
ADD CONSTRAINT analysis_run_lifecycle_succeeded_shape
CHECK (
    state <> 'succeeded'
    OR (
        failure_category IS NULL
        AND job_id IS NOT NULL
        AND attempt_id IS NOT NULL
    )
);

CREATE UNIQUE INDEX analysis_run_lifecycle_succeeded_unique
ON public.analysis_run_lifecycle_events (analysis_run_id)
WHERE state = 'succeeded';

CREATE FUNCTION public.acquire_analysis_job(
    p_lease_owner TEXT,
    p_processor_version TEXT,
    p_lease_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
    analysis_job_id UUID,
    analysis_job_attempt_id UUID,
    analysis_run_id UUID,
    workspace_id UUID,
    job_kind TEXT,
    job_version SMALLINT,
    attempt_number INTEGER,
    lease_token UUID,
    lease_expires_at TIMESTAMPTZ,
    processor_version TEXT,
    traceparent TEXT,
    tracestate TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    operation_time TIMESTAMPTZ := clock_timestamp();
    candidate_id UUID;
    leased_job public.analysis_jobs%ROWTYPE;
    created_attempt public.analysis_job_attempts%ROWTYPE;
    next_sequence BIGINT;
BEGIN
    IF p_lease_owner IS NULL
        OR length(p_lease_owner) NOT BETWEEN 1 AND 128
        OR p_lease_owner ~ E'[\\r\\n]'
    THEN
        RAISE EXCEPTION 'Analysis worker identity is invalid.'
            USING ERRCODE = '22023';
    END IF;

    IF p_processor_version IS NULL
        OR length(p_processor_version) NOT BETWEEN 1 AND 128
        OR p_processor_version ~ E'[\\r\\n]'
    THEN
        RAISE EXCEPTION 'Analysis processor version is invalid.'
            USING ERRCODE = '22023';
    END IF;

    IF p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 1 AND 300 THEN
        RAISE EXCEPTION 'Analysis job lease duration is invalid.'
            USING ERRCODE = '22023';
    END IF;

    SELECT job.analysis_job_id
    INTO candidate_id
    FROM public.analysis_jobs AS job
    INNER JOIN public.analysis_runs AS run
        ON run.analysis_run_id = job.analysis_run_id
       AND run.workspace_id = job.workspace_id
    WHERE job.terminal_outcome IS NULL
      AND job.available_at <= operation_time
      AND job.attempt_count < job.max_attempts
      AND (
          job.lease_token IS NULL
          OR job.lease_expires_at <= operation_time
      )
    ORDER BY job.available_at, job.created_at, job.analysis_job_id
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    UPDATE public.analysis_jobs AS job
    SET attempt_count = job.attempt_count + 1,
        lease_owner = p_lease_owner,
        lease_token = gen_random_uuid(),
        lease_expires_at = operation_time + make_interval(secs => p_lease_seconds),
        updated_at = operation_time
    WHERE job.analysis_job_id = candidate_id
    RETURNING job.* INTO STRICT leased_job;

    INSERT INTO public.analysis_job_attempts (
        analysis_job_id,
        attempt_number,
        lease_owner,
        lease_token,
        processor_version,
        started_at
    )
    VALUES (
        leased_job.analysis_job_id,
        leased_job.attempt_count,
        leased_job.lease_owner,
        leased_job.lease_token,
        p_processor_version,
        operation_time
    )
    RETURNING * INTO STRICT created_attempt;

    SELECT coalesce(max(event.sequence_number), 0) + 1
    INTO next_sequence
    FROM public.analysis_run_lifecycle_events AS event
    WHERE event.analysis_run_id = leased_job.analysis_run_id;

    INSERT INTO public.analysis_run_lifecycle_events (
        analysis_run_id,
        sequence_number,
        state,
        job_id,
        attempt_id,
        occurred_at
    )
    VALUES (
        leased_job.analysis_run_id,
        next_sequence,
        'running',
        leased_job.analysis_job_id,
        created_attempt.analysis_job_attempt_id,
        operation_time
    );

    RETURN QUERY SELECT
        leased_job.analysis_job_id,
        created_attempt.analysis_job_attempt_id,
        leased_job.analysis_run_id,
        leased_job.workspace_id,
        leased_job.job_kind,
        leased_job.job_version,
        created_attempt.attempt_number,
        created_attempt.lease_token,
        leased_job.lease_expires_at,
        created_attempt.processor_version,
        leased_job.traceparent,
        leased_job.tracestate;
END;
$$;

CREATE FUNCTION public.complete_analysis_job_success(
    p_job_id UUID,
    p_attempt_id UUID,
    p_lease_token UUID,
    p_result_fingerprint TEXT,
    p_duration_milliseconds INTEGER
)
RETURNS SETOF public.analysis_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    operation_time TIMESTAMPTZ := clock_timestamp();
    leased_job public.analysis_jobs%ROWTYPE;
    active_attempt public.analysis_job_attempts%ROWTYPE;
    next_sequence BIGINT;
BEGIN
    IF p_result_fingerprint IS NULL
        OR length(p_result_fingerprint) NOT BETWEEN 1 AND 256
        OR p_result_fingerprint ~ E'[\\r\\n]'
    THEN
        RAISE EXCEPTION 'Analysis result fingerprint is invalid.'
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

    IF leased_job.terminal_outcome = 'succeeded' THEN
        IF FOUND
            AND active_attempt.outcome = 'succeeded'
            AND active_attempt.result_fingerprint = p_result_fingerprint
        THEN
            RETURN NEXT leased_job;
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

    UPDATE public.analysis_job_attempts
    SET outcome = 'succeeded',
        result_fingerprint = p_result_fingerprint,
        duration_milliseconds = p_duration_milliseconds,
        completed_at = operation_time
    WHERE analysis_job_attempt_id = active_attempt.analysis_job_attempt_id;

    UPDATE public.analysis_jobs
    SET terminal_outcome = 'succeeded',
        completed_at = operation_time,
        lease_owner = NULL,
        lease_token = NULL,
        lease_expires_at = NULL,
        updated_at = operation_time
    WHERE analysis_job_id = leased_job.analysis_job_id
    RETURNING * INTO STRICT leased_job;

    SELECT coalesce(max(event.sequence_number), 0) + 1
    INTO next_sequence
    FROM public.analysis_run_lifecycle_events AS event
    WHERE event.analysis_run_id = leased_job.analysis_run_id;

    INSERT INTO public.analysis_run_lifecycle_events (
        analysis_run_id,
        sequence_number,
        state,
        job_id,
        attempt_id,
        occurred_at
    )
    VALUES (
        leased_job.analysis_run_id,
        next_sequence,
        'succeeded',
        leased_job.analysis_job_id,
        active_attempt.analysis_job_attempt_id,
        operation_time
    );

    RETURN NEXT leased_job;
END;
$$;

CREATE FUNCTION public.check_analysis_worker_ready()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM job.analysis_job_id
    FROM public.analysis_jobs AS job
    LIMIT 1;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_analysis_job(TEXT, TEXT, INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_analysis_job(TEXT, TEXT, INTEGER)
TO service_role;

REVOKE ALL ON FUNCTION public.complete_analysis_job_success(UUID, UUID, UUID, TEXT, INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_analysis_job_success(UUID, UUID, UUID, TEXT, INTEGER)
TO service_role;

REVOKE ALL ON FUNCTION public.check_analysis_worker_ready()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_analysis_worker_ready()
TO service_role;

COMMENT ON FUNCTION public.acquire_analysis_job(TEXT, TEXT, INTEGER) IS
    'Leases at most one available Analysis job and atomically records its attempt and running lifecycle fact.';
COMMENT ON FUNCTION public.complete_analysis_job_success(UUID, UUID, UUID, TEXT, INTEGER) IS
    'Lease-fenced, replay-safe successful completion of one deterministic Analysis job attempt.';
COMMENT ON FUNCTION public.check_analysis_worker_ready() IS
    'Non-mutating bounded database readiness command for the Analysis worker.';
