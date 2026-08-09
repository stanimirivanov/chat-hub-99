-- First Phase 4 processing increment: persist the accepted lifecycle fact and
-- one capability-specific outbox intent in the existing start transaction.

CREATE TABLE public.analysis_run_lifecycle_events (
    analysis_run_lifecycle_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL
        REFERENCES public.analysis_runs(analysis_run_id) ON DELETE RESTRICT,
    sequence_number BIGINT NOT NULL
        CONSTRAINT analysis_run_lifecycle_sequence_positive
        CHECK (sequence_number > 0),
    state TEXT NOT NULL
        CONSTRAINT analysis_run_lifecycle_state_supported
        CHECK (state = 'created'),
    failure_category TEXT,
    job_id UUID,
    attempt_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT analysis_run_lifecycle_sequence_unique
        UNIQUE (analysis_run_id, sequence_number),
    CONSTRAINT analysis_run_lifecycle_created_shape
        CHECK (
            state <> 'created'
            OR (
                sequence_number = 1
                AND failure_category IS NULL
                AND job_id IS NULL
                AND attempt_id IS NULL
            )
        )
);

CREATE UNIQUE INDEX analysis_run_lifecycle_created_unique
ON public.analysis_run_lifecycle_events (analysis_run_id)
WHERE state = 'created';

CREATE FUNCTION private.reject_analysis_run_lifecycle_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'Analysis Run lifecycle events are immutable.'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER analysis_run_lifecycle_events_are_immutable
BEFORE UPDATE OR DELETE ON public.analysis_run_lifecycle_events
FOR EACH ROW
EXECUTE FUNCTION private.reject_analysis_run_lifecycle_event_mutation();

CREATE TABLE public.analysis_run_outbox_events (
    analysis_run_outbox_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL
        REFERENCES public.analysis_runs(analysis_run_id) ON DELETE RESTRICT,
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(workspace_id) ON DELETE RESTRICT,
    event_name TEXT NOT NULL DEFAULT 'analysis_run.requested'
        CONSTRAINT analysis_run_outbox_event_name_supported
        CHECK (event_name = 'analysis_run.requested'),
    event_version SMALLINT NOT NULL DEFAULT 1
        CONSTRAINT analysis_run_outbox_event_version_supported
        CHECK (event_version = 1),
    traceparent TEXT NOT NULL
        CONSTRAINT analysis_run_outbox_traceparent_valid
        CHECK (
            traceparent ~ '^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$'
            AND split_part(traceparent, '-', 2) <> repeat('0', 32)
            AND split_part(traceparent, '-', 3) <> repeat('0', 16)
        ),
    tracestate TEXT
        CONSTRAINT analysis_run_outbox_tracestate_valid
        CHECK (
            tracestate IS NULL
            OR (
                length(tracestate) BETWEEN 1 AND 512
                AND tracestate !~ E'[\\r\\n]'
            )
        ),
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    claimed_by TEXT,
    claim_token UUID,
    claim_expires_at TIMESTAMPTZ,
    attempt_count INTEGER NOT NULL DEFAULT 0
        CONSTRAINT analysis_run_outbox_attempt_count_valid
        CHECK (attempt_count BETWEEN 0 AND 5),
    published_at TIMESTAMPTZ,
    last_error_category TEXT
        CONSTRAINT analysis_run_outbox_error_category_valid
        CHECK (
            last_error_category IS NULL
            OR last_error_category ~ '^[a-z0-9._-]{1,64}$'
        ),
    dead_lettered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT analysis_run_outbox_event_unique
        UNIQUE (analysis_run_id, event_name, event_version),
    CONSTRAINT analysis_run_outbox_claim_shape
        CHECK (
            (claimed_by IS NULL AND claim_token IS NULL AND claim_expires_at IS NULL)
            OR (
                claimed_by IS NOT NULL
                AND length(claimed_by) BETWEEN 1 AND 128
                AND claimed_by !~ E'[\\r\\n]'
                AND claim_token IS NOT NULL
                AND claim_expires_at IS NOT NULL
            )
        ),
    CONSTRAINT analysis_run_outbox_terminal_state_exclusive
        CHECK (published_at IS NULL OR dead_lettered_at IS NULL)
);

CREATE INDEX analysis_run_outbox_available_idx
ON public.analysis_run_outbox_events (available_at, created_at, analysis_run_outbox_event_id)
WHERE published_at IS NULL AND dead_lettered_at IS NULL;

ALTER TABLE public.analysis_run_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_run_outbox_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analysis_run_lifecycle_events
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.analysis_run_outbox_events
FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION public.start_analysis_run(UUID, UUID);

CREATE FUNCTION public.start_analysis_run(
    p_workspace_id UUID,
    p_requested_by UUID,
    p_traceparent TEXT,
    p_tracestate TEXT DEFAULT NULL
)
RETURNS SETOF public.analysis_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    created_run public.analysis_runs%ROWTYPE;
BEGIN
    IF NOT private.can_request_analysis_run(p_workspace_id, p_requested_by) THEN
        RAISE EXCEPTION 'Analysis Run resource is not accessible.'
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.analysis_runs (workspace_id, requested_by)
    VALUES (p_workspace_id, p_requested_by)
    RETURNING * INTO STRICT created_run;

    INSERT INTO public.analysis_run_lifecycle_events (
        analysis_run_id,
        sequence_number,
        state
    )
    VALUES (created_run.analysis_run_id, 1, 'created');

    INSERT INTO public.analysis_run_outbox_events (
        analysis_run_id,
        workspace_id,
        traceparent,
        tracestate
    )
    VALUES (
        created_run.analysis_run_id,
        created_run.workspace_id,
        p_traceparent,
        p_tracestate
    );

    RETURN NEXT created_run;
END;
$$;

REVOKE ALL ON FUNCTION public.start_analysis_run(UUID, UUID, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_analysis_run(UUID, UUID, TEXT, TEXT)
TO service_role;

COMMENT ON TABLE public.analysis_run_lifecycle_events IS
    'Append-only processing lifecycle facts for immutable Analysis Runs.';
COMMENT ON TABLE public.analysis_run_outbox_events IS
    'Capability-specific durable intents for Analysis Run processing.';
COMMENT ON FUNCTION public.start_analysis_run(UUID, UUID, TEXT, TEXT) IS
    'Atomically authorizes and persists an Analysis Run, its created lifecycle fact, and its requested outbox event.';
