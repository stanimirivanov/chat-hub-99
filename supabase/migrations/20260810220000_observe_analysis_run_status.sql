-- Fifth Phase 4 processing increment: expose the latest immutable lifecycle
-- fact through the existing authorized Analysis Run read command.

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
        analysis_run.analysis_run_id,
        analysis_run.workspace_id,
        analysis_run.requested_by,
        lifecycle.state,
        lifecycle.failure_category,
        analysis_run.created_at
    FROM public.analysis_runs AS analysis_run
    INNER JOIN LATERAL (
        SELECT event.state, event.failure_category
        FROM public.analysis_run_lifecycle_events AS event
        WHERE event.analysis_run_id = analysis_run.analysis_run_id
        ORDER BY event.sequence_number DESC
        LIMIT 1
    ) AS lifecycle ON TRUE
    WHERE analysis_run.analysis_run_id = p_analysis_run_id
      AND analysis_run.workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Analysis Run resource is not accessible.'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_analysis_run(UUID, UUID, UUID)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analysis_run(UUID, UUID, UUID)
TO service_role;

COMMENT ON FUNCTION public.get_analysis_run(UUID, UUID, UUID) IS
    'Returns one authorized Analysis Run with status derived from its latest immutable lifecycle fact.';
