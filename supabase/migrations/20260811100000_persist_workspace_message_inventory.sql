-- First result-bearing Analysis slice: snapshot a bounded set of immutable
-- message revisions and atomically persist one deterministic proposed finding.

CREATE TABLE public.analysis_results (
    analysis_result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id UUID NOT NULL UNIQUE
        REFERENCES public.analysis_runs(analysis_run_id) ON DELETE RESTRICT,
    result_kind TEXT NOT NULL
        CONSTRAINT analysis_result_kind_supported
        CHECK (result_kind = 'workspace-message-inventory'),
    processor_version TEXT NOT NULL
        CONSTRAINT analysis_result_processor_version_valid
        CHECK (length(processor_version) BETWEEN 1 AND 128),
    provider_kind TEXT NOT NULL
        CONSTRAINT analysis_result_provider_supported
        CHECK (provider_kind = 'deterministic'),
    model TEXT,
    evaluation_version TEXT NOT NULL
        CONSTRAINT analysis_result_evaluation_supported
        CHECK (evaluation_version = 'workspace-message-inventory.v1'),
    result_fingerprint TEXT NOT NULL
        CONSTRAINT analysis_result_fingerprint_valid
        CHECK (length(result_fingerprint) BETWEEN 1 AND 256),
    source_count INTEGER NOT NULL
        CONSTRAINT analysis_result_source_count_valid
        CHECK (source_count BETWEEN 0 AND 100),
    source_truncated BOOLEAN NOT NULL,
    summary TEXT NOT NULL
        CONSTRAINT analysis_result_summary_valid
        CHECK (length(summary) BETWEEN 1 AND 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT analysis_result_provider_shape CHECK (
        provider_kind <> 'deterministic' OR model IS NULL
    )
);

CREATE TABLE public.analysis_result_sources (
    analysis_result_id UUID NOT NULL
        REFERENCES public.analysis_results(analysis_result_id) ON DELETE RESTRICT,
    ordinal INTEGER NOT NULL CHECK (ordinal BETWEEN 1 AND 100),
    message_id UUID NOT NULL,
    message_version_id UUID NOT NULL,
    PRIMARY KEY (analysis_result_id, ordinal),
    UNIQUE (analysis_result_id, message_version_id),
    FOREIGN KEY (message_id, message_version_id)
        REFERENCES public.message_versions(message_id, message_version_id)
        ON DELETE RESTRICT
);

CREATE TABLE public.analysis_findings (
    analysis_finding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_result_id UUID NOT NULL UNIQUE
        REFERENCES public.analysis_results(analysis_result_id) ON DELETE RESTRICT,
    finding_kind TEXT NOT NULL CHECK (finding_kind = 'workspace-message-inventory'),
    finding_status TEXT NOT NULL CHECK (finding_status = 'proposed'),
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
    summary TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 500),
    confidence NUMERIC(4, 3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE FUNCTION private.reject_analysis_output_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'Analysis output records are immutable.'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER analysis_results_are_immutable
BEFORE UPDATE OR DELETE ON public.analysis_results
FOR EACH ROW EXECUTE FUNCTION private.reject_analysis_output_mutation();

CREATE TRIGGER analysis_result_sources_are_immutable
BEFORE UPDATE OR DELETE ON public.analysis_result_sources
FOR EACH ROW EXECUTE FUNCTION private.reject_analysis_output_mutation();

CREATE TRIGGER analysis_findings_are_immutable
BEFORE UPDATE OR DELETE ON public.analysis_findings
FOR EACH ROW EXECUTE FUNCTION private.reject_analysis_output_mutation();

ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_result_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_findings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analysis_results
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.analysis_result_sources
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.analysis_findings
FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.load_analysis_job_sources(
    p_job_id UUID,
    p_attempt_id UUID,
    p_lease_token UUID
)
RETURNS TABLE (
    message_id UUID,
    message_version_id UUID,
    author_user_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    operation_time TIMESTAMPTZ := clock_timestamp();
    leased_job public.analysis_jobs%ROWTYPE;
    accepted_run public.analysis_runs%ROWTYPE;
BEGIN
    SELECT job.*
    INTO leased_job
    FROM public.analysis_jobs AS job
    INNER JOIN public.analysis_job_attempts AS attempt
        ON attempt.analysis_job_id = job.analysis_job_id
       AND attempt.analysis_job_attempt_id = p_attempt_id
       AND attempt.lease_token = p_lease_token
       AND attempt.outcome IS NULL
    WHERE job.analysis_job_id = p_job_id
      AND job.terminal_outcome IS NULL
      AND job.lease_token = p_lease_token
      AND job.lease_expires_at > operation_time;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Analysis job lease is stale.'
            USING ERRCODE = 'P0003';
    END IF;

    SELECT run.*
    INTO STRICT accepted_run
    FROM public.analysis_runs AS run
    WHERE run.analysis_run_id = leased_job.analysis_run_id
      AND run.workspace_id = leased_job.workspace_id;

    IF NOT private.can_request_analysis_run(
        accepted_run.workspace_id,
        accepted_run.requested_by
    ) THEN
        RAISE EXCEPTION 'Analysis source access was revoked.'
            USING ERRCODE = 'P0004';
    END IF;

    RETURN QUERY
    SELECT
        message.message_id,
        head.latest_message_version_id,
        message.author_user_id
    FROM public.message_heads AS head
    INNER JOIN public.messages AS message
        ON message.message_id = head.message_id
       AND message.workspace_id = head.workspace_id
       AND message.channel_id = head.channel_id
    INNER JOIN public.channel_heads AS channel_head
        ON channel_head.channel_id = message.channel_id
       AND channel_head.workspace_id = message.workspace_id
    WHERE head.workspace_id = leased_job.workspace_id
      AND head.message_status = 'active'
      AND channel_head.channel_status = 'active'
    ORDER BY message.created_at DESC, message.message_id DESC
    LIMIT 101;
END;
$$;

DROP FUNCTION public.complete_analysis_job_success(UUID, UUID, UUID, TEXT, INTEGER);

CREATE FUNCTION public.complete_analysis_job_success(
    p_job_id UUID,
    p_attempt_id UUID,
    p_lease_token UUID,
    p_result_fingerprint TEXT,
    p_duration_milliseconds INTEGER,
    p_result JSONB
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
    created_result public.analysis_results%ROWTYPE;
    next_sequence BIGINT;
    expected_source_count INTEGER;
    inserted_source_count INTEGER;
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

    IF jsonb_typeof(p_result) IS DISTINCT FROM 'object'
        OR p_result->>'kind' IS DISTINCT FROM 'workspace-message-inventory'
        OR p_result->>'providerKind' IS DISTINCT FROM 'deterministic'
        OR p_result->'model' IS DISTINCT FROM 'null'::JSONB
        OR p_result->>'evaluationVersion' IS DISTINCT FROM 'workspace-message-inventory.v1'
        OR p_result->>'processorVersion' IS NULL
        OR length(p_result->>'processorVersion') NOT BETWEEN 1 AND 128
        OR p_result->>'summary' IS NULL
        OR length(p_result->>'summary') NOT BETWEEN 1 AND 500
        OR jsonb_typeof(p_result->'sources') IS DISTINCT FROM 'array'
        OR jsonb_typeof(p_result->'sourceTruncated') IS DISTINCT FROM 'boolean'
        OR jsonb_typeof(p_result->'finding') IS DISTINCT FROM 'object'
        OR p_result->'finding'->>'kind' IS DISTINCT FROM 'workspace-message-inventory'
        OR p_result->'finding'->>'status' IS DISTINCT FROM 'proposed'
        OR length(p_result->'finding'->>'title') NOT BETWEEN 1 AND 120
        OR length(p_result->'finding'->>'summary') NOT BETWEEN 1 AND 500
        OR (p_result->'finding'->>'confidence')::NUMERIC NOT BETWEEN 0 AND 1
    THEN
        RAISE EXCEPTION 'Analysis result payload is invalid.'
            USING ERRCODE = '22023';
    END IF;

    expected_source_count := jsonb_array_length(p_result->'sources');
    IF expected_source_count > 100
        OR (p_result->>'sourceCount')::INTEGER IS DISTINCT FROM expected_source_count
    THEN
        RAISE EXCEPTION 'Analysis result source set is invalid.'
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
            AND EXISTS (
                SELECT 1 FROM public.analysis_results AS result
                WHERE result.analysis_run_id = leased_job.analysis_run_id
                  AND result.result_fingerprint = p_result_fingerprint
            )
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
        OR active_attempt.processor_version <> p_result->>'processorVersion'
    THEN
        RAISE EXCEPTION 'Analysis job lease is stale.'
            USING ERRCODE = 'P0003';
    END IF;

    INSERT INTO public.analysis_results (
        analysis_run_id,
        result_kind,
        processor_version,
        provider_kind,
        model,
        evaluation_version,
        result_fingerprint,
        source_count,
        source_truncated,
        summary,
        created_at
    )
    VALUES (
        leased_job.analysis_run_id,
        p_result->>'kind',
        p_result->>'processorVersion',
        p_result->>'providerKind',
        NULL,
        p_result->>'evaluationVersion',
        p_result_fingerprint,
        expected_source_count,
        (p_result->>'sourceTruncated')::BOOLEAN,
        p_result->>'summary',
        operation_time
    )
    RETURNING * INTO STRICT created_result;

    INSERT INTO public.analysis_result_sources (
        analysis_result_id,
        ordinal,
        message_id,
        message_version_id
    )
    SELECT
        created_result.analysis_result_id,
        source.ordinal::INTEGER,
        (source.value->>'messageId')::UUID,
        (source.value->>'messageRevisionId')::UUID
    FROM jsonb_array_elements(p_result->'sources') WITH ORDINALITY AS source(value, ordinal)
    INNER JOIN public.messages AS message
        ON message.message_id = (source.value->>'messageId')::UUID
       AND message.workspace_id = leased_job.workspace_id
    INNER JOIN public.message_versions AS version
        ON version.message_id = message.message_id
       AND version.message_version_id = (source.value->>'messageRevisionId')::UUID;

    GET DIAGNOSTICS inserted_source_count = ROW_COUNT;
    IF inserted_source_count <> expected_source_count THEN
        RAISE EXCEPTION 'Analysis result contains an invalid source reference.'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.analysis_findings (
        analysis_result_id,
        finding_kind,
        finding_status,
        title,
        summary,
        confidence,
        created_at
    )
    VALUES (
        created_result.analysis_result_id,
        p_result->'finding'->>'kind',
        p_result->'finding'->>'status',
        p_result->'finding'->>'title',
        p_result->'finding'->>'summary',
        (p_result->'finding'->>'confidence')::NUMERIC,
        operation_time
    );

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

DROP FUNCTION public.get_analysis_run(UUID, UUID, UUID);

CREATE FUNCTION public.get_analysis_run(
    p_workspace_id UUID,
    p_analysis_run_id UUID,
    p_requested_by UUID
)
RETURNS TABLE (
    analysis_run_id UUID,
    workspace_id UUID,
    requested_by UUID,
    status TEXT,
    failure_category TEXT,
    result JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT private.can_request_analysis_run(p_workspace_id, p_requested_by) THEN
        RAISE EXCEPTION 'Analysis Run resource is not accessible.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    SELECT
        run.analysis_run_id,
        run.workspace_id,
        run.requested_by,
        lifecycle.state,
        lifecycle.failure_category,
        CASE WHEN analysis_result.analysis_result_id IS NULL THEN NULL ELSE
            jsonb_build_object(
                'id', analysis_result.analysis_result_id,
                'analysisRunId', run.analysis_run_id,
                'kind', analysis_result.result_kind,
                'processorVersion', analysis_result.processor_version,
                'providerKind', analysis_result.provider_kind,
                'model', analysis_result.model,
                'evaluationVersion', analysis_result.evaluation_version,
                'sourceCount', analysis_result.source_count,
                'sourceTruncated', analysis_result.source_truncated,
                'sources', coalesce(sources.items, '[]'::JSONB),
                'finding', jsonb_build_object(
                    'kind', finding.finding_kind,
                    'status', finding.finding_status,
                    'title', finding.title,
                    'summary', finding.summary,
                    'confidence', finding.confidence
                ),
                'createdAt', analysis_result.created_at
            )
        END,
        run.created_at
    FROM public.analysis_runs AS run
    INNER JOIN LATERAL (
        SELECT event.state, event.failure_category
        FROM public.analysis_run_lifecycle_events AS event
        WHERE event.analysis_run_id = run.analysis_run_id
        ORDER BY event.sequence_number DESC
        LIMIT 1
    ) AS lifecycle ON TRUE
    LEFT JOIN public.analysis_results AS analysis_result
        ON analysis_result.analysis_run_id = run.analysis_run_id
    LEFT JOIN public.analysis_findings AS finding
        ON finding.analysis_result_id = analysis_result.analysis_result_id
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(
            jsonb_build_object(
                'messageId', source.message_id,
                'messageRevisionId', source.message_version_id
            ) ORDER BY source.ordinal
        ) AS items
        FROM public.analysis_result_sources AS source
        WHERE source.analysis_result_id = analysis_result.analysis_result_id
    ) AS sources ON TRUE
    WHERE run.analysis_run_id = p_analysis_run_id
      AND run.workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Analysis Run resource is not accessible.'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.load_analysis_job_sources(UUID, UUID, UUID)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.load_analysis_job_sources(UUID, UUID, UUID)
TO service_role;

REVOKE ALL ON FUNCTION public.complete_analysis_job_success(UUID, UUID, UUID, TEXT, INTEGER, JSONB)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_analysis_job_success(UUID, UUID, UUID, TEXT, INTEGER, JSONB)
TO service_role;

REVOKE ALL ON FUNCTION public.get_analysis_run(UUID, UUID, UUID)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analysis_run(UUID, UUID, UUID)
TO service_role;

COMMENT ON TABLE public.analysis_results IS
    'Immutable, versioned outputs produced by completed Analysis Runs.';
COMMENT ON TABLE public.analysis_result_sources IS
    'Ordered immutable message-revision evidence selected for an Analysis result.';
COMMENT ON TABLE public.analysis_findings IS
    'Immutable proposed findings; later review facts must not rewrite these rows.';
COMMENT ON FUNCTION public.load_analysis_job_sources(UUID, UUID, UUID) IS
    'Returns at most 101 newest active message revisions to a currently authorized lease owner.';
COMMENT ON FUNCTION public.complete_analysis_job_success(UUID, UUID, UUID, TEXT, INTEGER, JSONB) IS
    'Lease-fenced atomic persistence of one immutable result, proposed finding, successful attempt, and succeeded lifecycle fact.';
