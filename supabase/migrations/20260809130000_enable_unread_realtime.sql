-- ============================================================================
-- Realtime unread-count invalidations
-- ============================================================================
--
-- Unread counts are derived data. Realtime therefore publishes only private,
-- payload-minimal invalidations; clients reload the authoritative RLS-backed
-- list_workspace_channel_unread_counts snapshot after every signal.
--
-- Workspace topics cover message and channel lifecycle changes. Per-user
-- topics cover that user's read-position changes, including changes made from
-- another browser tab or device, without revealing them to other members.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.can_receive_workspace_unread_broadcast(
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
                'workspace-unread:' ||
                workspace_membership_heads.workspace_id::TEXT
    );
$$;


REVOKE ALL
ON FUNCTION private.can_receive_workspace_unread_broadcast(TEXT, UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION private.can_receive_workspace_unread_broadcast(TEXT, UUID)
TO authenticated;


CREATE POLICY workspace_unread_broadcast_select
ON realtime.messages
FOR SELECT
TO authenticated
USING (
    realtime.messages.extension = 'broadcast'
    AND private.can_receive_workspace_unread_broadcast(
        (SELECT realtime.topic()),
        (SELECT auth.uid())
    )
);


CREATE POLICY profile_unread_broadcast_select
ON realtime.messages
FOR SELECT
TO authenticated
USING (
    realtime.messages.extension = 'broadcast'
    AND (SELECT realtime.topic()) =
        'profile-unread:' || (SELECT auth.uid())::TEXT
);


CREATE OR REPLACE FUNCTION private.broadcast_workspace_unread_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM realtime.send(
        jsonb_build_object('workspace_id', NEW.workspace_id::TEXT),
        'changed',
        'workspace-unread:' || NEW.workspace_id::TEXT,
        TRUE
    );

    RETURN NULL;
END;
$$;


REVOKE ALL
ON FUNCTION private.broadcast_workspace_unread_change()
FROM PUBLIC;


CREATE TRIGGER message_heads_broadcast_workspace_unread_change
AFTER INSERT OR UPDATE OF message_status
ON public.message_heads
FOR EACH ROW
EXECUTE FUNCTION private.broadcast_workspace_unread_change();


CREATE TRIGGER channel_heads_broadcast_workspace_unread_change
AFTER INSERT OR UPDATE OF channel_status
ON public.channel_heads
FOR EACH ROW
EXECUTE FUNCTION private.broadcast_workspace_unread_change();


CREATE OR REPLACE FUNCTION private.broadcast_profile_unread_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM realtime.send(
        jsonb_build_object(
            'workspace_id', NEW.workspace_id::TEXT,
            'channel_id', NEW.channel_id::TEXT
        ),
        'changed',
        'profile-unread:' || NEW.user_id::TEXT,
        TRUE
    );

    RETURN NULL;
END;
$$;


REVOKE ALL
ON FUNCTION private.broadcast_profile_unread_change()
FROM PUBLIC;


CREATE TRIGGER channel_read_positions_broadcast_profile_unread_change
AFTER INSERT OR UPDATE
ON public.channel_read_positions
FOR EACH ROW
EXECUTE FUNCTION private.broadcast_profile_unread_change();


COMMENT ON FUNCTION private.can_receive_workspace_unread_broadcast(
    TEXT,
    UUID
) IS
    'Returns whether an active workspace member may receive its private unread invalidation topic.';


COMMENT ON POLICY workspace_unread_broadcast_select
ON realtime.messages IS
    'Allows active members to receive private unread invalidations for their workspace topics.';


COMMENT ON POLICY profile_unread_broadcast_select
ON realtime.messages IS
    'Allows a user to receive private read-position invalidations only for their own profile topic.';


COMMENT ON FUNCTION private.broadcast_workspace_unread_change() IS
    'Invalidates workspace unread snapshots after message or channel lifecycle changes.';


COMMENT ON FUNCTION private.broadcast_profile_unread_change() IS
    'Invalidates one user unread snapshot after their read position advances.';
