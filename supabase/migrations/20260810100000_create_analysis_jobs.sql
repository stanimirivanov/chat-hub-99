-- Second Phase 4 processing increment: lease one requested event and dispatch
-- it into one durable, versioned Analysis job. No worker execution happens here.

CREATE TABLE public.analysis_jobs (
    analysis_job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL
        REFERENCES public.analysis_runs(analysis_run_id) ON DELETE RESTRICT,
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(workspace_id) ON DELETE RESTRICT,
    source_outbox_event_id UUID NOT NULL UNIQUE
        REFERENCES public.analysis_run_outbox_events(analysis_run_outbox_event_id)
        ON DELETE RESTRICT,
    job_kind TEXT NOT NULL DEFAULT 'analysis.execute'
        CONSTRAINT analysis_job_kind_supported
        CHECK (job_kind = 'analysis.execute'),
    job_version SMALLINT NOT NULL DEFAULT 1
        CONSTRAINT analysis_job_version_supported
        CHECK (job_version = 1),
    traceparent TEXT NOT NULL
        CONSTRAINT analysis_job_traceparent_valid
        CHECK (
            traceparent ~ '^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$'
            AND split_part(traceparent, '-', 2) <> repeat('0', 32)
            AND split_part(traceparent, '-', 3) <> repeat('0', 16)
        ),
    tracestate TEXT
        CONSTRAINT analysis_job_tracestate_valid
        CHECK (
            tracestate IS NULL
            OR (
                length(tracestate) BETWEEN 1 AND 512
                AND tracestate !~ E'[\\r\\n]'
            )
        ),
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    attempt_count INTEGER NOT NULL DEFAULT 0
        CONSTRAINT analysis_job_attempt_count_valid
        CHECK (attempt_count BETWEEN 0 AND 5),
    max_attempts INTEGER NOT NULL DEFAULT 5
        CONSTRAINT analysis_job_max_attempts_valid
        CHECK (max_attempts = 5),
    lease_owner TEXT,
    lease_token UUID,
    lease_expires_at TIMESTAMPTZ,
    terminal_outcome TEXT
        CONSTRAINT analysis_job_terminal_outcome_supported
        CHECK (terminal_outcome IN ('succeeded', 'failed')),
    last_failure_category TEXT
        CONSTRAINT analysis_job_failure_category_valid
        CHECK (
            last_failure_category IS NULL
            OR last_failure_category ~ '^[a-z0-9._-]{1,64}$'
        ),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT analysis_job_version_unique
        UNIQUE (analysis_run_id, job_kind, job_version),
    CONSTRAINT analysis_job_lease_shape
        CHECK (
            (lease_owner IS NULL AND lease_token IS NULL AND lease_expires_at IS NULL)
            OR (
                lease_owner IS NOT NULL
                AND length(lease_owner) BETWEEN 1 AND 128
                AND lease_owner !~ E'[\\r\\n]'
                AND lease_token IS NOT NULL
                AND lease_expires_at IS NOT NULL
            )
        ),
    CONSTRAINT analysis_job_completion_shape
        CHECK (
            (terminal_outcome IS NULL AND completed_at IS NULL)
            OR (terminal_outcome IS NOT NULL AND completed_at IS NOT NULL)
        )
);

CREATE INDEX analysis_jobs_available_idx
ON public.analysis_jobs (available_at, created_at, analysis_job_id)
WHERE terminal_outcome IS NULL;

CREATE TABLE public.analysis_job_attempts (
    analysis_job_attempt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_job_id UUID NOT NULL
        REFERENCES public.analysis_jobs(analysis_job_id) ON DELETE RESTRICT,
    attempt_number INTEGER NOT NULL
        CONSTRAINT analysis_job_attempt_number_valid
        CHECK (attempt_number BETWEEN 1 AND 5),
    lease_owner TEXT NOT NULL
        CONSTRAINT analysis_job_attempt_lease_owner_valid
        CHECK (
            length(lease_owner) BETWEEN 1 AND 128
            AND lease_owner !~ E'[\\r\\n]'
        ),
    lease_token UUID NOT NULL UNIQUE,
    processor_version TEXT
        CONSTRAINT analysis_job_attempt_processor_version_valid
        CHECK (
            processor_version IS NULL
            OR (
                length(processor_version) BETWEEN 1 AND 128
                AND processor_version !~ E'[\\r\\n]'
            )
        ),
    outcome TEXT
        CONSTRAINT analysis_job_attempt_outcome_supported
        CHECK (outcome IN ('succeeded', 'retryable_failure', 'terminal_failure')),
    failure_category TEXT
        CONSTRAINT analysis_job_attempt_failure_category_valid
        CHECK (
            failure_category IS NULL
            OR failure_category ~ '^[a-z0-9._-]{1,64}$'
        ),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT analysis_job_attempt_number_unique
        UNIQUE (analysis_job_id, attempt_number),
    CONSTRAINT analysis_job_attempt_completion_shape
        CHECK (
            (outcome IS NULL AND completed_at IS NULL AND failure_category IS NULL)
            OR (
                outcome = 'succeeded'
                AND completed_at IS NOT NULL
                AND failure_category IS NULL
            )
            OR (
                outcome IN ('retryable_failure', 'terminal_failure')
                AND completed_at IS NOT NULL
                AND failure_category IS NOT NULL
            )
        )
);

ALTER TABLE public.analysis_run_lifecycle_events
DROP CONSTRAINT analysis_run_lifecycle_state_supported;

ALTER TABLE public.analysis_run_lifecycle_events
ADD CONSTRAINT analysis_run_lifecycle_state_supported
CHECK (state IN ('created', 'queued')),
ADD CONSTRAINT analysis_run_lifecycle_queued_shape
CHECK (
    state <> 'queued'
    OR (failure_category IS NULL AND job_id IS NOT NULL)
),
ADD CONSTRAINT analysis_run_lifecycle_job_fk
FOREIGN KEY (job_id)
REFERENCES public.analysis_jobs(analysis_job_id) ON DELETE RESTRICT,
ADD CONSTRAINT analysis_run_lifecycle_attempt_fk
FOREIGN KEY (attempt_id)
REFERENCES public.analysis_job_attempts(analysis_job_attempt_id) ON DELETE RESTRICT;

ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_job_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analysis_jobs
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.analysis_job_attempts
FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.claim_analysis_run_outbox_event(
    p_claimed_by TEXT,
    p_lease_seconds INTEGER DEFAULT 30
)
RETURNS SETOF public.analysis_run_outbox_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    operation_time TIMESTAMPTZ := clock_timestamp();
BEGIN
    IF p_claimed_by IS NULL
        OR length(p_claimed_by) NOT BETWEEN 1 AND 128
        OR p_claimed_by ~ E'[\\r\\n]'
    THEN
        RAISE EXCEPTION 'Analysis Run dispatcher identity is invalid.'
            USING ERRCODE = '22023';
    END IF;

    IF p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 1 AND 300 THEN
        RAISE EXCEPTION 'Analysis Run outbox lease duration is invalid.'
            USING ERRCODE = '22023';
    END IF;

    RETURN QUERY
    WITH candidate AS (
        SELECT event.analysis_run_outbox_event_id
        FROM public.analysis_run_outbox_events AS event
        WHERE event.published_at IS NULL
          AND event.dead_lettered_at IS NULL
          AND event.available_at <= operation_time
          AND event.attempt_count < 5
          AND (
              event.claim_token IS NULL
              OR event.claim_expires_at <= operation_time
          )
        ORDER BY
            event.available_at,
            event.created_at,
            event.analysis_run_outbox_event_id
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    UPDATE public.analysis_run_outbox_events AS event
    SET claimed_by = p_claimed_by,
        claim_token = gen_random_uuid(),
        claim_expires_at = operation_time + make_interval(secs => p_lease_seconds),
        attempt_count = event.attempt_count + 1
    FROM candidate
    WHERE event.analysis_run_outbox_event_id = candidate.analysis_run_outbox_event_id
    RETURNING event.*;
END;
$$;

CREATE FUNCTION public.dispatch_analysis_run_outbox_event(
    p_event_id UUID,
    p_claim_token UUID
)
RETURNS SETOF public.analysis_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    claimed_event public.analysis_run_outbox_events%ROWTYPE;
    dispatched_job public.analysis_jobs%ROWTYPE;
    next_sequence BIGINT;
    operation_time TIMESTAMPTZ := clock_timestamp();
BEGIN
    SELECT event.*
    INTO claimed_event
    FROM public.analysis_run_outbox_events AS event
    WHERE event.analysis_run_outbox_event_id = p_event_id
    FOR UPDATE;

    IF NOT FOUND OR claimed_event.claim_token IS DISTINCT FROM p_claim_token THEN
        RAISE EXCEPTION 'Analysis Run outbox claim is stale.'
            USING ERRCODE = 'P0003';
    END IF;

    IF claimed_event.published_at IS NOT NULL THEN
        SELECT job.*
        INTO STRICT dispatched_job
        FROM public.analysis_jobs AS job
        WHERE job.source_outbox_event_id = claimed_event.analysis_run_outbox_event_id;

        RETURN NEXT dispatched_job;
        RETURN;
    END IF;

    IF claimed_event.dead_lettered_at IS NOT NULL
        OR claimed_event.claim_expires_at <= operation_time
    THEN
        RAISE EXCEPTION 'Analysis Run outbox claim is stale.'
            USING ERRCODE = 'P0003';
    END IF;

    IF claimed_event.event_name <> 'analysis_run.requested'
        OR claimed_event.event_version <> 1
    THEN
        RAISE EXCEPTION 'Analysis Run outbox event is unsupported.'
            USING ERRCODE = 'P0004';
    END IF;

    INSERT INTO public.analysis_jobs (
        analysis_run_id,
        workspace_id,
        source_outbox_event_id,
        traceparent,
        tracestate,
        available_at
    )
    VALUES (
        claimed_event.analysis_run_id,
        claimed_event.workspace_id,
        claimed_event.analysis_run_outbox_event_id,
        claimed_event.traceparent,
        claimed_event.tracestate,
        operation_time
    )
    ON CONFLICT (analysis_run_id, job_kind, job_version) DO NOTHING
    RETURNING * INTO dispatched_job;

    IF NOT FOUND THEN
        SELECT job.*
        INTO STRICT dispatched_job
        FROM public.analysis_jobs AS job
        WHERE job.analysis_run_id = claimed_event.analysis_run_id
          AND job.job_kind = 'analysis.execute'
          AND job.job_version = 1;

        IF dispatched_job.source_outbox_event_id
            <> claimed_event.analysis_run_outbox_event_id
        THEN
            RAISE EXCEPTION 'Analysis Run job source invariant was violated.'
                USING ERRCODE = 'P0004';
        END IF;
    ELSE
        SELECT coalesce(max(event.sequence_number), 0) + 1
        INTO next_sequence
        FROM public.analysis_run_lifecycle_events AS event
        WHERE event.analysis_run_id = claimed_event.analysis_run_id;

        INSERT INTO public.analysis_run_lifecycle_events (
            analysis_run_id,
            sequence_number,
            state,
            job_id
        )
        VALUES (
            claimed_event.analysis_run_id,
            next_sequence,
            'queued',
            dispatched_job.analysis_job_id
        );
    END IF;

    UPDATE public.analysis_run_outbox_events
    SET published_at = operation_time
    WHERE analysis_run_outbox_event_id = claimed_event.analysis_run_outbox_event_id;

    RETURN NEXT dispatched_job;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_analysis_run_outbox_event(TEXT, INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_analysis_run_outbox_event(TEXT, INTEGER)
TO service_role;

REVOKE ALL ON FUNCTION public.dispatch_analysis_run_outbox_event(UUID, UUID)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_analysis_run_outbox_event(UUID, UUID)
TO service_role;

COMMENT ON TABLE public.analysis_jobs IS
    'Durable capability-specific Analysis work; one versioned execution job exists per Analysis Run.';
COMMENT ON TABLE public.analysis_job_attempts IS
    'Auditable execution attempts created when a worker later leases an Analysis job.';
COMMENT ON FUNCTION public.claim_analysis_run_outbox_event(TEXT, INTEGER) IS
    'Claims at most one available requested event with a bounded lease and fencing token.';
COMMENT ON FUNCTION public.dispatch_analysis_run_outbox_event(UUID, UUID) IS
    'Idempotently turns a currently claimed requested event into one queued Analysis job.';
