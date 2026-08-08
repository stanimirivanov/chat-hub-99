-- ============================================================================
-- Active-member authorization for private channel typing Broadcast topics
-- ============================================================================

CREATE OR REPLACE FUNCTION private.can_access_channel_typing(
    p_topic TEXT,
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
        FROM public.channel_heads
        INNER JOIN public.workspace_heads
            ON workspace_heads.workspace_id = channel_heads.workspace_id
        INNER JOIN public.workspace_membership_heads
            ON workspace_membership_heads.workspace_id =
                channel_heads.workspace_id
        WHERE workspace_membership_heads.user_id = p_user_id
          AND workspace_membership_heads.membership_status = 'active'
          AND workspace_heads.workspace_status = 'active'
          AND channel_heads.channel_status = 'active'
          AND p_topic = 'channel-typing:' || channel_heads.channel_id::TEXT
    );
$$;

REVOKE ALL
ON FUNCTION private.can_access_channel_typing(TEXT, UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION private.can_access_channel_typing(TEXT, UUID)
TO authenticated;

CREATE POLICY channel_typing_select
ON realtime.messages
FOR SELECT
TO authenticated
USING (
    realtime.messages.extension = 'broadcast'
    AND private.can_access_channel_typing(
        (SELECT realtime.topic()),
        (SELECT auth.uid())
    )
);

CREATE POLICY channel_typing_insert
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
    realtime.messages.extension = 'broadcast'
    AND private.can_access_channel_typing(
        (SELECT realtime.topic()),
        (SELECT auth.uid())
    )
);

COMMENT ON FUNCTION private.can_access_channel_typing(TEXT, UUID) IS
    'Returns whether an active workspace member may use one active channel typing topic.';

COMMENT ON POLICY channel_typing_select
ON realtime.messages IS
    'Allows active members to receive advisory typing events for active channels.';

COMMENT ON POLICY channel_typing_insert
ON realtime.messages IS
    'Allows active members to publish advisory typing events for active channels.';
