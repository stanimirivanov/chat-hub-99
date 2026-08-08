-- ============================================================================
-- Per-workspace channel-navigation realtime broadcasts
-- ============================================================================
--
-- A channel archive removes that channel from the ordinary active-channel
-- query. A payload-minimal private Broadcast therefore acts only as an
-- invalidation: clients always reload the authoritative RLS-visible channel
-- collection instead of trusting provider event rows.
--
-- Topic authorization is derived from active workspace membership. The
-- helper executes as its owner so Realtime authorization does not depend on
-- recursively evaluating the public membership-table policies.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.can_receive_workspace_channel_broadcast(
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
        FROM public.workspace_membership_heads
        INNER JOIN public.workspace_heads
            ON workspace_heads.workspace_id =
                workspace_membership_heads.workspace_id
        WHERE workspace_membership_heads.user_id = p_user_id
          AND workspace_membership_heads.membership_status = 'active'
          AND workspace_heads.workspace_status = 'active'
          AND p_topic =
                'workspace-channels:' ||
                workspace_membership_heads.workspace_id::TEXT
    );
$$;


REVOKE ALL
ON FUNCTION private.can_receive_workspace_channel_broadcast(TEXT, UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION private.can_receive_workspace_channel_broadcast(TEXT, UUID)
TO authenticated;


CREATE POLICY workspace_channel_broadcast_select
ON realtime.messages
FOR SELECT
TO authenticated
USING (
    realtime.messages.extension = 'broadcast'
    AND private.can_receive_workspace_channel_broadcast(
        (SELECT realtime.topic()),
        (SELECT auth.uid())
    )
);


CREATE OR REPLACE FUNCTION private.broadcast_workspace_channel_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM realtime.send(
        jsonb_build_object(
            'channel_id', NEW.channel_id::TEXT
        ),
        'changed',
        'workspace-channels:' || NEW.workspace_id::TEXT,
        TRUE
    );

    RETURN NULL;
END;
$$;


REVOKE ALL
ON FUNCTION private.broadcast_workspace_channel_change()
FROM PUBLIC;


CREATE TRIGGER channel_heads_broadcast_workspace_change
AFTER INSERT OR UPDATE
ON public.channel_heads
FOR EACH ROW
EXECUTE FUNCTION private.broadcast_workspace_channel_change();


COMMENT ON FUNCTION private.can_receive_workspace_channel_broadcast(
    TEXT,
    UUID
) IS
    'Returns whether an active workspace member may receive the private channel-navigation topic.';


COMMENT ON POLICY workspace_channel_broadcast_select
ON realtime.messages IS
    'Allows active members to receive private channel-navigation invalidations for their workspace topics.';


COMMENT ON FUNCTION private.broadcast_workspace_channel_change() IS
    'Broadcasts a payload-minimal invalidation after a channel head is created or advanced.';


COMMENT ON TRIGGER channel_heads_broadcast_workspace_change
ON public.channel_heads IS
    'Invalidates active channel navigation after channel creation, update, or archival.';
