-- Minimal deterministic Analysis Run boundary for the first server capability.
-- Execution, findings, jobs, retries, and model metadata remain Phase 4 scope.

CREATE TABLE public.analysis_runs (
    analysis_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(workspace_id) ON DELETE RESTRICT,
    requested_by UUID NOT NULL
        REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'created'
        CONSTRAINT analysis_runs_status_valid CHECK (status = 'created'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX analysis_runs_workspace_created_idx
ON public.analysis_runs (workspace_id, created_at DESC, analysis_run_id DESC);

CREATE FUNCTION private.reject_analysis_run_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'Analysis Run records are immutable.'
        USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER analysis_runs_are_immutable
BEFORE UPDATE OR DELETE ON public.analysis_runs
FOR EACH ROW EXECUTE FUNCTION private.reject_analysis_run_mutation();

ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analysis_runs FROM anon, authenticated;

CREATE FUNCTION private.can_request_analysis_run(
    p_workspace_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_heads AS workspace_head
        INNER JOIN public.workspace_versions AS workspace_version
            ON workspace_version.workspace_version_id =
                workspace_head.workspace_version_id
           AND workspace_version.workspace_id = workspace_head.workspace_id
        INNER JOIN public.workspace_memberships AS membership
            ON membership.workspace_id = workspace_head.workspace_id
           AND membership.user_id = p_user_id
        INNER JOIN public.workspace_membership_heads AS membership_head
            ON membership_head.workspace_membership_id =
                membership.workspace_membership_id
        WHERE workspace_head.workspace_id = p_workspace_id
          AND workspace_version.status = 'active'
          AND membership_head.membership_status = 'active'
    );
$$;

CREATE FUNCTION public.start_analysis_run(
    p_workspace_id UUID,
    p_requested_by UUID
)
RETURNS SETOF public.analysis_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT private.can_request_analysis_run(p_workspace_id, p_requested_by) THEN
        RAISE EXCEPTION 'Analysis Run resource is not accessible.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    INSERT INTO public.analysis_runs (workspace_id, requested_by)
    VALUES (p_workspace_id, p_requested_by)
    RETURNING *;
END;
$$;

CREATE FUNCTION public.get_analysis_run(
    p_workspace_id UUID,
    p_analysis_run_id UUID,
    p_requested_by UUID
)
RETURNS SETOF public.analysis_runs
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
    SELECT analysis_run.*
    FROM public.analysis_runs AS analysis_run
    WHERE analysis_run.analysis_run_id = p_analysis_run_id
      AND analysis_run.workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Analysis Run resource is not accessible.'
            USING ERRCODE = 'P0002';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.start_analysis_run(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_analysis_run(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_analysis_run(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_analysis_run(UUID, UUID, UUID) TO service_role;

COMMENT ON TABLE public.analysis_runs IS
    'Immutable acceptance records for trusted analysis requests. Execution details arrive in Phase 4.';
