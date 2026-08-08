-- ============================================================================
-- Active-member authorization for private workspace Presence topics
-- ============================================================================
--
-- Presence is ephemeral advisory state. PostgreSQL stores no presence rows,
-- but Realtime evaluates these policies when a client joins a private topic.
-- SELECT permits receiving presence changes; INSERT permits tracking the
-- caller's presence. Both are scoped to an active workspace membership.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.can_access_workspace_presence(
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
                'workspace-presence:' ||
                workspace_membership_heads.workspace_id::TEXT
    );
$$;


REVOKE ALL
ON FUNCTION private.can_access_workspace_presence(TEXT, UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION private.can_access_workspace_presence(TEXT, UUID)
TO authenticated;


CREATE POLICY workspace_presence_select
ON realtime.messages
FOR SELECT
TO authenticated
USING (
    realtime.messages.extension = 'presence'
    AND private.can_access_workspace_presence(
        (SELECT realtime.topic()),
        (SELECT auth.uid())
    )
);


CREATE POLICY workspace_presence_insert
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
    realtime.messages.extension = 'presence'
    AND private.can_access_workspace_presence(
        (SELECT realtime.topic()),
        (SELECT auth.uid())
    )
);


COMMENT ON FUNCTION private.can_access_workspace_presence(TEXT, UUID) IS
    'Returns whether an active member may observe and track presence on one private workspace topic.';


COMMENT ON POLICY workspace_presence_select
ON realtime.messages IS
    'Allows active members to receive presence changes for their workspace topic.';


COMMENT ON POLICY workspace_presence_insert
ON realtime.messages IS
    'Allows active members to track presence on their workspace topic.';
