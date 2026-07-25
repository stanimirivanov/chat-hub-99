-- ============================================================================
-- Workspace membership read policies
-- ============================================================================
--
-- Visibility rules:
--
--   Active workspace members may read:
--
--     - active membership identities;
--     - active membership heads;
--     - events belonging to currently active memberships.
--
--   Active workspace owners may additionally read:
--
--     - removed membership identities;
--     - removed membership heads;
--     - complete event history for removed memberships.
--
--   Removed users and workspace outsiders cannot read membership data.
--
-- All mutations remain restricted to SECURITY DEFINER command functions.
-- ============================================================================


-- ============================================================================
-- Membership visibility helper
-- ============================================================================
--
-- This helper centralizes the membership-directory visibility rule and avoids
-- recursive RLS evaluation when policies on membership tables need to inspect
-- other membership heads.
--
-- The target membership is visible when:
--
--   - the caller has an active membership in the workspace; and
--   - the target membership is active;
--
-- or:
--
--   - the caller is an active workspace owner.
--
-- Owners therefore retain access to removed membership records for audit and
-- administration purposes.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.can_read_workspace_membership(
    p_workspace_membership_id UUID,
    p_workspace_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        EXISTS (
            SELECT 1
            FROM public.workspace_membership_heads
                AS caller_membership
            INNER JOIN public.workspace_heads
                ON workspace_heads.workspace_id =
                    caller_membership.workspace_id
            WHERE caller_membership.workspace_id =
                    p_workspace_id
              AND caller_membership.user_id =
                    p_user_id
              AND caller_membership.membership_status =
                    'active'
              AND workspace_heads.workspace_status =
                    'active'
        )
        AND (
            EXISTS (
                SELECT 1
                FROM public.workspace_membership_heads
                    AS target_membership
                WHERE target_membership.workspace_membership_id =
                        p_workspace_membership_id
                  AND target_membership.workspace_id =
                        p_workspace_id
                  AND target_membership.membership_status =
                        'active'
            )
            OR EXISTS (
                SELECT 1
                FROM public.workspace_membership_heads
                    AS caller_owner
                WHERE caller_owner.workspace_id =
                        p_workspace_id
                  AND caller_owner.user_id =
                        p_user_id
                  AND caller_owner.membership_role =
                        'owner'
                  AND caller_owner.membership_status =
                        'active'
            )
        );
$$;


REVOKE ALL
ON FUNCTION private.can_read_workspace_membership(UUID, UUID, UUID)
FROM PUBLIC;


-- RLS policies execute this helper while evaluating authenticated queries.
GRANT EXECUTE
ON FUNCTION private.can_read_workspace_membership(UUID, UUID, UUID)
TO authenticated;


-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE public.workspace_memberships
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.workspace_membership_events
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.workspace_membership_heads
ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- Stable membership identity policy
-- ============================================================================

CREATE POLICY workspace_memberships_authenticated_select
ON public.workspace_memberships
FOR SELECT
TO authenticated
USING (
    private.can_read_workspace_membership(
        workspace_membership_id,
        workspace_id,
        (SELECT auth.uid())
    )
);


-- ============================================================================
-- Immutable membership event policy
-- ============================================================================
--
-- Active members see event history for currently active memberships.
-- Active owners also see event history for removed memberships.
-- ============================================================================

CREATE POLICY workspace_membership_events_authenticated_select
ON public.workspace_membership_events
FOR SELECT
TO authenticated
USING (
    private.can_read_workspace_membership(
        workspace_membership_id,
        workspace_id,
        (SELECT auth.uid())
    )
);


-- ============================================================================
-- Current membership head policy
-- ============================================================================

CREATE POLICY workspace_membership_heads_authenticated_select
ON public.workspace_membership_heads
FOR SELECT
TO authenticated
USING (
    private.can_read_workspace_membership(
        workspace_membership_id,
        workspace_id,
        (SELECT auth.uid())
    )
);


-- ============================================================================
-- Read privileges
-- ============================================================================
--
-- GRANT allows authenticated users to attempt SELECT queries.
-- RLS determines which membership rows each authenticated user can observe.
-- ============================================================================

GRANT SELECT
ON TABLE public.workspace_memberships
TO authenticated;


GRANT SELECT
ON TABLE public.workspace_membership_events
TO authenticated;


GRANT SELECT
ON TABLE public.workspace_membership_heads
TO authenticated;


GRANT SELECT
ON public.current_workspace_memberships
TO authenticated;


-- ============================================================================
-- Anonymous access
-- ============================================================================

REVOKE ALL
ON TABLE public.workspace_memberships
FROM anon;


REVOKE ALL
ON TABLE public.workspace_membership_events
FROM anon;


REVOKE ALL
ON TABLE public.workspace_membership_heads
FROM anon;


REVOKE ALL
ON public.current_workspace_memberships
FROM anon;


-- ============================================================================
-- Direct-write protection
-- ============================================================================
--
-- Reassert that application roles cannot bypass membership commands.
-- ============================================================================

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_memberships
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_membership_events
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_membership_heads
FROM anon, authenticated;


-- ============================================================================
-- PostgreSQL documentation
-- ============================================================================

COMMENT ON FUNCTION private.can_read_workspace_membership(
    UUID,
    UUID,
    UUID
) IS
    'Returns whether a user may read a workspace membership. Active members may read active memberships; active owners may additionally read inactive membership history.';


COMMENT ON POLICY workspace_memberships_authenticated_select
ON public.workspace_memberships IS
    'Allows active members to read active membership identities and active owners to read all membership identities in their workspace.';


COMMENT ON POLICY workspace_membership_events_authenticated_select
ON public.workspace_membership_events IS
    'Allows active members to read event history for active memberships and active owners to read event history for all memberships.';


COMMENT ON POLICY workspace_membership_heads_authenticated_select
ON public.workspace_membership_heads IS
    'Allows active members to read active membership heads and active owners to read all membership heads in their workspace.';