-- ============================================================================
-- Message read policies
-- ============================================================================
--
-- Visibility model:
--
--   Active workspace members may read:
--
--     - message identities in active channels;
--     - message heads in active channels;
--     - current content of active messages;
--     - deleted messages as content-free placeholders.
--
--   The original author and active workspace owners may additionally read:
--
--     - complete immutable message revision history;
--     - retained content of deleted messages.
--
--   Removed members, workspace outsiders, and anonymous users cannot read
--   message data.
--
-- Message mutations remain available only through SECURITY DEFININER commands.
-- ============================================================================


-- ============================================================================
-- Message identity and head visibility
-- ============================================================================
--
-- Message identities and heads remain visible after soft deletion so active
-- channel members can retain conversation ordering and render a deletion
-- placeholder.
--
-- The parent workspace and channel must both remain active.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.can_read_message(
    p_message_id UUID,
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
        FROM public.messages
        INNER JOIN public.message_heads
            ON message_heads.message_id =
                messages.message_id
        INNER JOIN public.workspace_heads
            ON workspace_heads.workspace_id =
                messages.workspace_id
        INNER JOIN public.channel_heads
            ON channel_heads.channel_id =
                messages.channel_id
           AND channel_heads.workspace_id =
                messages.workspace_id
        INNER JOIN public.workspace_membership_heads
            AS caller_membership
            ON caller_membership.workspace_id =
                messages.workspace_id
           AND caller_membership.user_id =
                p_user_id
        WHERE messages.message_id =
                p_message_id
          AND workspace_heads.workspace_status =
                'active'
          AND channel_heads.channel_status =
                'active'
          AND caller_membership.membership_status =
                'active'
    );
$$;


COMMENT ON FUNCTION private.can_read_message(
    UUID,
    UUID
) IS
    'Returns whether an active workspace member may read a message identity and head in an active channel.';


REVOKE ALL
ON FUNCTION private.can_read_message(UUID, UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION private.can_read_message(UUID, UUID)
TO authenticated;


-- ============================================================================
-- Immutable message-version visibility
-- ============================================================================
--
-- Ordinary active members may read only:
--
--   - the current immutable version;
--   - while the message remains active.
--
-- They therefore see deleted messages through messages and message_heads, but
-- no message_versions row is visible for those deleted messages.
--
-- The original author and active workspace owners may read complete revision
-- history for both active and deleted messages.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.can_read_message_version(
    p_message_id UUID,
    p_message_version_id UUID,
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
        FROM public.messages
        INNER JOIN public.message_heads
            ON message_heads.message_id =
                messages.message_id
        INNER JOIN public.workspace_heads
            ON workspace_heads.workspace_id =
                messages.workspace_id
        INNER JOIN public.channel_heads
            ON channel_heads.channel_id =
                messages.channel_id
           AND channel_heads.workspace_id =
                messages.workspace_id
        INNER JOIN public.workspace_membership_heads
            AS caller_membership
            ON caller_membership.workspace_id =
                messages.workspace_id
           AND caller_membership.user_id =
                p_user_id
        WHERE messages.message_id =
                p_message_id
          AND workspace_heads.workspace_status =
                'active'
          AND channel_heads.channel_status =
                'active'
          AND caller_membership.membership_status =
                'active'
          AND (
                (
                    message_heads.message_status = 'active'
                    AND message_heads.latest_message_version_id =
                        p_message_version_id
                )
                OR messages.author_user_id =
                    p_user_id
                OR caller_membership.membership_role =
                    'owner'
          )
    );
$$;


COMMENT ON FUNCTION private.can_read_message_version(
    UUID,
    UUID,
    UUID
) IS
    'Allows active members to read current active-message content, while original authors and active owners may read complete revision history and deleted content.';


REVOKE ALL
ON FUNCTION private.can_read_message_version(
    UUID,
    UUID,
    UUID
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION private.can_read_message_version(
    UUID,
    UUID,
    UUID
)
TO authenticated;


-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE public.messages
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.message_versions
ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.message_heads
ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- Stable message identity policy
-- ============================================================================

CREATE POLICY messages_authenticated_select
ON public.messages
FOR SELECT
TO authenticated
USING (
    private.can_read_message(
        message_id,
        (SELECT auth.uid())
    )
);


COMMENT ON POLICY messages_authenticated_select
ON public.messages IS
    'Allows active workspace members to read message identities in active channels, including deleted-message placeholders.';


-- ============================================================================
-- Immutable version policy
-- ============================================================================

CREATE POLICY message_versions_authenticated_select
ON public.message_versions
FOR SELECT
TO authenticated
USING (
    private.can_read_message_version(
        message_id,
        message_version_id,
        (SELECT auth.uid())
    )
);


COMMENT ON POLICY message_versions_authenticated_select
ON public.message_versions IS
    'Allows ordinary members to read current active-message content and permits original authors and active owners to read complete revision history.';


-- ============================================================================
-- Message head policy
-- ============================================================================

CREATE POLICY message_heads_authenticated_select
ON public.message_heads
FOR SELECT
TO authenticated
USING (
    private.can_read_message(
        message_id,
        (SELECT auth.uid())
    )
);


COMMENT ON POLICY message_heads_authenticated_select
ON public.message_heads IS
    'Allows active workspace members to read active and deleted message heads in active channels.';


-- ============================================================================
-- Rebuild the current-message projection
-- ============================================================================
--
-- The previous projection used an INNER JOIN to message_versions.
--
-- That would remove deleted messages entirely for ordinary members because RLS
-- hides their retained immutable content. A LEFT JOIN preserves the visible
-- identity and head, producing a placeholder with NULL content.
--
-- Head fields provide the current version identity and number even when the
-- corresponding content row is hidden.
-- ============================================================================

CREATE OR REPLACE VIEW public.current_messages
WITH (security_invoker = true)
AS
SELECT
    messages.message_id,
    messages.workspace_id,
    messages.channel_id,
    messages.author_user_id,
    messages.created_at,

    message_heads.latest_message_version_id
        AS message_version_id,

    message_heads.latest_version_number
        AS version_number,

    message_versions.content,

    message_versions.created_by
        AS version_created_by,

    message_versions.created_at
        AS version_created_at,

    message_heads.message_status,
    message_heads.deleted_by,
    message_heads.deleted_at,
    message_heads.updated_at,

    message_heads.latest_version_number > 1
        AS is_edited
FROM public.messages
INNER JOIN public.message_heads
    ON message_heads.message_id =
        messages.message_id
LEFT JOIN public.message_versions
    ON message_versions.message_id =
        message_heads.message_id
   AND message_versions.message_version_id =
        message_heads.latest_message_version_id;


COMMENT ON VIEW public.current_messages IS
    'Current message projection. Deleted messages remain visible as placeholders when retained content is hidden by row-level security.';


-- ============================================================================
-- Authenticated read privileges
-- ============================================================================
--
-- Table privileges permit SELECT attempts. RLS determines row visibility.
-- ============================================================================

GRANT SELECT
ON TABLE public.messages
TO authenticated;


GRANT SELECT
ON TABLE public.message_versions
TO authenticated;


GRANT SELECT
ON TABLE public.message_heads
TO authenticated;


GRANT SELECT
ON public.current_messages
TO authenticated;


-- ============================================================================
-- Anonymous access
-- ============================================================================

REVOKE ALL
ON TABLE public.messages
FROM anon;


REVOKE ALL
ON TABLE public.message_versions
FROM anon;


REVOKE ALL
ON TABLE public.message_heads
FROM anon;


REVOKE ALL
ON public.current_messages
FROM anon;


-- ============================================================================
-- Direct-write protection
-- ============================================================================

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.messages
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.message_versions
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.message_heads
FROM anon, authenticated;