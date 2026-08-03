-- ============================================================================
-- Per-user workspace-access realtime broadcasts
-- ============================================================================
--
-- A membership update that suspends, removes, or departs a user also makes the
-- updated membership head invisible to that user under the ordinary SELECT
-- policy. A Postgres Changes listener therefore cannot be the reliable signal
-- for access revocation.
--
-- Instead, the membership-head trigger sends a payload-minimal private
-- broadcast to a topic owned by the affected user. Realtime Authorization
-- permits an authenticated client to receive only the topic derived from its
-- own auth.uid(). The client treats the event only as an invalidation signal
-- and reloads the authoritative RLS-visible workspace collection.
-- ============================================================================

CREATE POLICY workspace_access_broadcast_select
ON realtime.messages
FOR SELECT
TO authenticated
USING (
    realtime.messages.extension = 'broadcast'
    AND (SELECT realtime.topic()) =
        'workspace-access:' || (SELECT auth.uid())::TEXT
);


CREATE OR REPLACE FUNCTION private.broadcast_workspace_access_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM realtime.send(
        jsonb_build_object(
            'workspace_id', NEW.workspace_id::TEXT
        ),
        'changed',
        'workspace-access:' || NEW.user_id::TEXT,
        TRUE
    );

    RETURN NULL;
END;
$$;


REVOKE ALL
ON FUNCTION private.broadcast_workspace_access_change()
FROM PUBLIC;


CREATE TRIGGER workspace_membership_heads_broadcast_access_change
AFTER INSERT OR UPDATE
ON public.workspace_membership_heads
FOR EACH ROW
EXECUTE FUNCTION private.broadcast_workspace_access_change();


COMMENT ON POLICY workspace_access_broadcast_select
ON realtime.messages IS
    'Allows an authenticated user to receive private workspace-access invalidations only from the topic derived from their own auth identity.';


COMMENT ON FUNCTION private.broadcast_workspace_access_change() IS
    'Broadcasts a payload-minimal invalidation to the affected user after a workspace membership head is created or advanced.';


COMMENT ON TRIGGER workspace_membership_heads_broadcast_access_change
ON public.workspace_membership_heads IS
    'Invalidates the affected user workspace-access projection after membership creation, role change, reinstatement, suspension, removal, or departure.';
