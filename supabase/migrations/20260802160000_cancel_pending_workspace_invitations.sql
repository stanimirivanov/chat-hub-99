-- ============================================================================
-- Owner management of pending workspace invitations
-- ============================================================================
--
-- Cancellation is another immutable invitation event. The invitation identity
-- and prior events remain unchanged while the mutable head advances to the new
-- terminal state.
-- ============================================================================

ALTER TABLE public.workspace_invitation_events
DROP CONSTRAINT workspace_invitation_events_type_valid;

ALTER TABLE public.workspace_invitation_events
ADD CONSTRAINT workspace_invitation_events_type_valid
CHECK (event_type IN ('invited', 'accepted', 'declined', 'cancelled'));


ALTER TABLE public.workspace_invitation_heads
DROP CONSTRAINT workspace_invitation_heads_status_valid;

ALTER TABLE public.workspace_invitation_heads
ADD CONSTRAINT workspace_invitation_heads_status_valid
CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'cancelled'));


CREATE FUNCTION public.list_pending_workspace_invitations_for_workspace(
    p_workspace_id UUID
)
RETURNS TABLE (
    workspace_invitation_id UUID,
    workspace_id UUID,
    invited_user_id UUID,
    invitation_status TEXT,
    invited_username TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to list workspace invitations'
            USING ERRCODE = '28000';
    END IF;

    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION
            'Workspace identifier is required'
            USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.workspace_heads
        WHERE workspace_heads.workspace_id = p_workspace_id
    ) THEN
        RAISE EXCEPTION
            'Workspace % does not exist', p_workspace_id
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.workspace_heads
        WHERE workspace_heads.workspace_id = p_workspace_id
          AND workspace_heads.workspace_status = 'active'
    ) THEN
        RAISE EXCEPTION
            'Workspace % is not active', p_workspace_id
            USING ERRCODE = '55000';
    END IF;

    IF NOT private.is_active_workspace_owner(
        p_workspace_id,
        authenticated_user_id
    ) THEN
        RAISE EXCEPTION
            'Only an active workspace owner may list pending invitations'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        invitation_heads.workspace_invitation_id,
        invitation_heads.workspace_id,
        invitation_heads.invited_user_id,
        invitation_heads.invitation_status,
        profile_heads.current_username AS invited_username
    FROM public.workspace_invitation_heads AS invitation_heads
    INNER JOIN public.profile_heads
        ON profile_heads.user_id = invitation_heads.invited_user_id
    WHERE invitation_heads.workspace_id = p_workspace_id
      AND invitation_heads.invitation_status = 'pending'
    ORDER BY
        lower(profile_heads.current_username) NULLS LAST,
        invitation_heads.workspace_invitation_id;
END;
$$;


CREATE FUNCTION public.cancel_workspace_invitation(
    p_workspace_invitation_id UUID
)
RETURNS public.workspace_invitation_heads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;
    invitation_workspace_id UUID;
    current_invitation_head public.workspace_invitation_heads;
    current_sequence_number INTEGER;
    new_event public.workspace_invitation_events;
    resulting_head public.workspace_invitation_heads;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to cancel a workspace invitation'
            USING ERRCODE = '28000';
    END IF;

    IF p_workspace_invitation_id IS NULL THEN
        RAISE EXCEPTION
            'Workspace invitation identifier is required'
            USING ERRCODE = '22023';
    END IF;

    SELECT workspace_invitations.workspace_id
    INTO invitation_workspace_id
    FROM public.workspace_invitations
    WHERE workspace_invitations.workspace_invitation_id =
        p_workspace_invitation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Workspace invitation % does not exist',
            p_workspace_invitation_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Acceptance locks the workspace before the invitation head. Keeping that
    -- order here prevents the two commands from forming a deadlock cycle.
    PERFORM 1
    FROM public.workspace_heads
    WHERE workspace_heads.workspace_id = invitation_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Workspace % does not exist', invitation_workspace_id
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.workspace_heads
        WHERE workspace_heads.workspace_id = invitation_workspace_id
          AND workspace_heads.workspace_status = 'active'
    ) THEN
        RAISE EXCEPTION
            'Workspace % is not active', invitation_workspace_id
            USING ERRCODE = '55000';
    END IF;

    IF NOT private.is_active_workspace_owner(
        invitation_workspace_id,
        authenticated_user_id
    ) THEN
        RAISE EXCEPTION
            'Only an active workspace owner may cancel invitations'
            USING ERRCODE = '42501';
    END IF;

    SELECT workspace_invitation_heads.*
    INTO current_invitation_head
    FROM public.workspace_invitation_heads
    WHERE workspace_invitation_heads.workspace_invitation_id =
        p_workspace_invitation_id
    FOR UPDATE;

    IF current_invitation_head.invitation_status <> 'pending' THEN
        RAISE EXCEPTION
            'Only a pending workspace invitation may be cancelled'
            USING ERRCODE = '55000';
    END IF;

    SELECT workspace_invitation_events.sequence_number
    INTO current_sequence_number
    FROM public.workspace_invitation_events
    WHERE workspace_invitation_events.workspace_invitation_event_id =
        current_invitation_head.latest_event_id;

    INSERT INTO public.workspace_invitation_events (
        workspace_invitation_id,
        workspace_id,
        invited_user_id,
        sequence_number,
        event_type,
        performed_by
    )
    VALUES (
        current_invitation_head.workspace_invitation_id,
        current_invitation_head.workspace_id,
        current_invitation_head.invited_user_id,
        current_sequence_number + 1,
        'cancelled',
        authenticated_user_id
    )
    RETURNING * INTO new_event;

    UPDATE public.workspace_invitation_heads
    SET
        latest_event_id = new_event.workspace_invitation_event_id,
        invitation_status = 'cancelled'
    WHERE workspace_invitation_id = p_workspace_invitation_id
    RETURNING * INTO resulting_head;

    RETURN resulting_head;
END;
$$;


REVOKE ALL
ON FUNCTION public.list_pending_workspace_invitations_for_workspace(UUID)
FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_workspace_invitation(UUID) FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.list_pending_workspace_invitations_for_workspace(UUID)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_workspace_invitation(UUID)
TO authenticated;


COMMENT ON TABLE public.workspace_invitation_events IS
    'Append-only invited, accepted, declined, and cancelled invitation lifecycle events.';
COMMENT ON FUNCTION public.list_pending_workspace_invitations_for_workspace(UUID) IS
    'Lists pending invitations and current invited usernames for an active workspace owner.';
COMMENT ON FUNCTION public.cancel_workspace_invitation(UUID) IS
    'Cancels one pending invitation as an active owner of its active workspace without deleting history.';
