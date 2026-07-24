-- ============================================================================
-- Profile and workspace read policies
-- ============================================================================
--
-- This migration introduces the first application read boundary.
--
-- Authenticated users may:
--
--   - read their own profile regardless of current profile status;
--   - read other currently active profiles;
--   - read workspaces in which they have an active membership;
--   - read only the current immutable profile and workspace versions.
--
-- Application roles still cannot mutate tables directly. All writes continue
-- to pass through SECURITY DEFINER command functions.
-- ============================================================================


-- ============================================================================
-- Private RLS helper functions
-- ============================================================================

-- Determines whether a user currently has an active membership in a workspace.
--
-- SECURITY DEFINER is intentional. RLS policies may call this helper without
-- recursively evaluating workspace membership policies.
CREATE OR REPLACE FUNCTION private.is_active_workspace_member(
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
        FROM public.workspace_membership_heads
        WHERE workspace_membership_heads.workspace_id =
                p_workspace_id
          AND workspace_membership_heads.user_id =
                p_user_id
          AND workspace_membership_heads.membership_status =
                'active'
    );
$$;


-- Determines whether a profile version is the profile's current immutable
-- version.
CREATE OR REPLACE FUNCTION private.is_current_profile_version(
    p_profile_version_id UUID,
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
        FROM public.profile_heads
        WHERE profile_heads.user_id =
                p_user_id
          AND profile_heads.profile_version_id =
                p_profile_version_id
    );
$$;


-- Determines whether a workspace version is the workspace's current immutable
-- version.
CREATE OR REPLACE FUNCTION private.is_current_workspace_version(
    p_workspace_version_id UUID,
    p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_heads
        WHERE workspace_heads.workspace_id =
                p_workspace_id
          AND workspace_heads.workspace_version_id =
                p_workspace_version_id
    );
$$;


REVOKE ALL
ON FUNCTION private.is_active_workspace_member(UUID, UUID)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION private.is_current_profile_version(UUID, UUID)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION private.is_current_workspace_version(UUID, UUID)
FROM PUBLIC;

-- RLS policies execute these helpers while evaluating queries made by the
-- authenticated role. SECURITY DEFINER controls whose table privileges are
-- used inside the function, but callers still require EXECUTE permission.
GRANT EXECUTE
ON FUNCTION private.is_active_workspace_member(UUID, UUID)
TO authenticated;

GRANT EXECUTE
ON FUNCTION private.is_current_profile_version(UUID, UUID)
TO authenticated;

GRANT EXECUTE
ON FUNCTION private.is_current_workspace_version(UUID, UUID)
TO authenticated;

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.profile_versions
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.profile_heads
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.workspaces
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.workspace_versions
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.workspace_heads
ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- Profile read policies
-- ============================================================================

-- Stable profile identities are visible when:
--
--   - the row belongs to the authenticated user; or
--   - the profile is currently active.
CREATE POLICY profiles_authenticated_select
ON public.profiles
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.profile_heads
        WHERE profile_heads.user_id =
                profiles.user_id
          AND profile_heads.profile_status =
                'active'
    )
);


-- Only the current profile version is exposed.
--
-- Users may read:
--
--   - their own current version; or
--   - another user's current version when that profile is active.
CREATE POLICY profile_versions_authenticated_select
ON public.profile_versions
FOR SELECT
TO authenticated
USING (
    private.is_current_profile_version(
        profile_version_id,
        user_id
    )
    AND (
        user_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1
            FROM public.profile_heads
            WHERE profile_heads.user_id =
                    profile_versions.user_id
              AND profile_heads.profile_status =
                    'active'
        )
    )
);


CREATE POLICY profile_heads_authenticated_select
ON public.profile_heads
FOR SELECT
TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR profile_status = 'active'
);


-- ============================================================================
-- Workspace read policies
-- ============================================================================

-- A stable workspace identity is visible only to active members.
CREATE POLICY workspaces_active_member_select
ON public.workspaces
FOR SELECT
TO authenticated
USING (
    private.is_active_workspace_member(
        workspace_id,
        (SELECT auth.uid())
    )
);


-- Only the current immutable workspace version is visible, and only to active
-- members of that workspace.
CREATE POLICY workspace_versions_active_member_select
ON public.workspace_versions
FOR SELECT
TO authenticated
USING (
    private.is_active_workspace_member(
        workspace_id,
        (SELECT auth.uid())
    )
    AND private.is_current_workspace_version(
        workspace_version_id,
        workspace_id
    )
);


CREATE POLICY workspace_heads_active_member_select
ON public.workspace_heads
FOR SELECT
TO authenticated
USING (
    private.is_active_workspace_member(
        workspace_id,
        (SELECT auth.uid())
    )
);


-- ============================================================================
-- Read privileges
-- ============================================================================
--
-- GRANT determines which operations a role may attempt.
-- RLS determines which rows the role may actually observe.
--
-- No INSERT, UPDATE, or DELETE privilege is granted.
-- ============================================================================

GRANT SELECT
ON TABLE public.profiles
TO authenticated;


GRANT SELECT
ON TABLE public.profile_versions
TO authenticated;


GRANT SELECT
ON TABLE public.profile_heads
TO authenticated;


GRANT SELECT
ON TABLE public.workspaces
TO authenticated;


GRANT SELECT
ON TABLE public.workspace_versions
TO authenticated;


GRANT SELECT
ON TABLE public.workspace_heads
TO authenticated;


GRANT SELECT
ON public.current_profiles
TO authenticated;


GRANT SELECT
ON public.current_workspaces
TO authenticated;


-- Anonymous users receive no profile or workspace access.
REVOKE ALL
ON TABLE public.profiles
FROM anon;


REVOKE ALL
ON TABLE public.profile_versions
FROM anon;


REVOKE ALL
ON TABLE public.profile_heads
FROM anon;


REVOKE ALL
ON TABLE public.workspaces
FROM anon;


REVOKE ALL
ON TABLE public.workspace_versions
FROM anon;


REVOKE ALL
ON TABLE public.workspace_heads
FROM anon;


REVOKE ALL
ON public.current_profiles
FROM anon;


REVOKE ALL
ON public.current_workspaces
FROM anon;


-- ============================================================================
-- Direct-write protection
-- ============================================================================
--
-- Reassert that application roles cannot bypass the transactional command
-- functions.
-- ============================================================================

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.profiles
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.profile_versions
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.profile_heads
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspaces
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_versions
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_heads
FROM anon, authenticated;


-- ============================================================================
-- PostgreSQL documentation
-- ============================================================================

COMMENT ON FUNCTION private.is_active_workspace_member(UUID, UUID) IS
    'Returns whether a user currently has an active membership in a workspace. Used by RLS policies.';


COMMENT ON FUNCTION private.is_current_profile_version(UUID, UUID) IS
    'Returns whether an immutable profile version is the current version selected by profile_heads.';


COMMENT ON FUNCTION private.is_current_workspace_version(UUID, UUID) IS
    'Returns whether an immutable workspace version is the current version selected by workspace_heads.';