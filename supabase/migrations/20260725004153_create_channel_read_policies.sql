-- ============================================================================
-- Channel read policies
-- ============================================================================
--
-- Visibility rules:
--
--   Active workspace members may read:
--
--     - active channel identities;
--     - active channel heads;
--     - only the current version of each active channel.
--
--   Active workspace owners may additionally read:
--
--     - archived channel identities and heads;
--     - complete immutable version history for visible channels.
--
--   Removed members, workspace outsiders, and anonymous users cannot read
--   channel data.
--
-- Channel mutations remain available only through SECURITY DEFINER commands.
-- ============================================================================


-- ============================================================================
-- Channel visibility helper
-- ============================================================================
--
-- A channel is visible when:
--
--   - its workspace is active;
--   - the caller is an active workspace member;
--   - and either:
--       - the channel is active; or
--       - the caller is an active workspace owner.
--
-- The helper executes as its owner so policies can inspect workspace and
-- membership projections without recursively evaluating their RLS policies.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.can_read_channel(
    p_channel_id UUID,
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
        FROM public.channels
        INNER JOIN public.channel_heads
            ON channel_heads.channel_id =
                channels.channel_id
        INNER JOIN public.workspace_heads
            ON workspace_heads.workspace_id =
                channels.workspace_id
        INNER JOIN public.workspace_membership_heads
            AS caller_membership
            ON caller_membership.workspace_id =
                channels.workspace_id
           AND caller_membership.user_id =
                p_user_id
        WHERE channels.channel_id =
                p_channel_id
          AND workspace_heads.workspace_status =
                'active'
          AND caller_membership.membership_status =
                'active'
          AND (
                channel_heads.channel_status = 'active'
                OR caller_membership.membership_role = 'owner'
          )
    );
$$;


COMMENT ON FUNCTION private.can_read_channel(
    UUID,
    UUID
) IS
    'Returns whether an active workspace member may read a channel. Active owners may additionally read archived channels.';


REVOKE ALL
ON FUNCTION private.can_read_channel(UUID, UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION private.can_read_channel(UUID, UUID)
TO authenticated;


-- ============================================================================
-- Channel-version visibility helper
-- ============================================================================
--
-- Ordinary active members may read only the immutable version currently
-- referenced by channel_heads.
--
-- Active workspace owners may read complete channel version history, including
-- history belonging to archived channels.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.can_read_channel_version(
    p_channel_id UUID,
    p_channel_version_id UUID,
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
        FROM public.channels
        INNER JOIN public.channel_heads
            ON channel_heads.channel_id =
                channels.channel_id
        INNER JOIN public.workspace_heads
            ON workspace_heads.workspace_id =
                channels.workspace_id
        INNER JOIN public.workspace_membership_heads
            AS caller_membership
            ON caller_membership.workspace_id =
                channels.workspace_id
           AND caller_membership.user_id =
                p_user_id
        WHERE channels.channel_id =
                p_channel_id
          AND workspace_heads.workspace_status =
                'active'
          AND caller_membership.membership_status =
                'active'
          AND (
                (
                    channel_heads.channel_status = 'active'
                    AND channel_heads.latest_channel_version_id =
                        p_channel_version_id
                )
                OR caller_membership.membership_role = 'owner'
          )
    );
$$;


COMMENT ON FUNCTION private.can_read_channel_version(
    UUID,
    UUID,
    UUID
) IS
    'Allows active members to read current active-channel versions and active owners to read complete channel history.';


REVOKE ALL
ON FUNCTION private.can_read_channel_version(
    UUID,
    UUID,
    UUID
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION private.can_read_channel_version(
    UUID,
    UUID,
    UUID
)
TO authenticated;


-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE public.channels
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.channel_versions
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.channel_heads
ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- Stable channel identity policy
-- ============================================================================

CREATE POLICY channels_authenticated_select
ON public.channels
FOR SELECT
TO authenticated
USING (
    private.can_read_channel(
        channel_id,
        (SELECT auth.uid())
    )
);


COMMENT ON POLICY channels_authenticated_select
ON public.channels IS
    'Allows active workspace members to read active channel identities and active owners to additionally read archived channels.';


-- ============================================================================
-- Immutable channel-version policy
-- ============================================================================

CREATE POLICY channel_versions_authenticated_select
ON public.channel_versions
FOR SELECT
TO authenticated
USING (
    private.can_read_channel_version(
        channel_id,
        channel_version_id,
        (SELECT auth.uid())
    )
);


COMMENT ON POLICY channel_versions_authenticated_select
ON public.channel_versions IS
    'Allows active members to read only current channel versions and active owners to read full immutable channel history.';


-- ============================================================================
-- Current channel-head policy
-- ============================================================================

CREATE POLICY channel_heads_authenticated_select
ON public.channel_heads
FOR SELECT
TO authenticated
USING (
    private.can_read_channel(
        channel_id,
        (SELECT auth.uid())
    )
);


COMMENT ON POLICY channel_heads_authenticated_select
ON public.channel_heads IS
    'Allows active workspace members to read active channel heads and active owners to additionally read archived channel heads.';


-- ============================================================================
-- Authenticated read privileges
-- ============================================================================
--
-- Table privileges permit SELECT attempts. RLS decides which rows are visible.
--
-- current_channels is a security-invoker view, so its underlying table policies
-- are evaluated using the querying authenticated user.
-- ============================================================================

GRANT SELECT
ON TABLE public.channels
TO authenticated;


GRANT SELECT
ON TABLE public.channel_versions
TO authenticated;


GRANT SELECT
ON TABLE public.channel_heads
TO authenticated;


GRANT SELECT
ON public.current_channels
TO authenticated;


-- ============================================================================
-- Anonymous access
-- ============================================================================

REVOKE ALL
ON TABLE public.channels
FROM anon;


REVOKE ALL
ON TABLE public.channel_versions
FROM anon;


REVOKE ALL
ON TABLE public.channel_heads
FROM anon;


REVOKE ALL
ON public.current_channels
FROM anon;


-- ============================================================================
-- Direct-write protection
-- ============================================================================

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.channels
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.channel_versions
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.channel_heads
FROM anon, authenticated;