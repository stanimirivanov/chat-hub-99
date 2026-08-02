-- ============================================================================
-- Reinstate former workspace members through the existing add command
-- ============================================================================
--
-- Exact-username addition is the user-facing operation for both first-time and
-- former members. A removed or left membership keeps its stable identity and
-- immutable history; adding that profile again appends `reinstated` and
-- advances the existing head instead of creating a second aggregate.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_workspace_member(
    p_workspace_id UUID,
    p_user_id UUID
)
RETURNS public.workspace_membership_heads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;

    current_membership_head
        public.workspace_membership_heads;

    current_sequence_number INTEGER;

    new_workspace_membership
        public.workspace_memberships;

    new_membership_event
        public.workspace_membership_events;

    resulting_membership_head
        public.workspace_membership_heads;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to add a workspace member'
            USING ERRCODE = '28000';
    END IF;

    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION
            'Workspace identifier is required'
            USING ERRCODE = '22023';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION
            'User identifier is required'
            USING ERRCODE = '22023';
    END IF;

    -- The workspace lock serializes archival and every membership command for
    -- this aggregate before current state is inspected.
    PERFORM 1
    FROM public.workspace_heads
    WHERE workspace_heads.workspace_id =
        p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Workspace % does not exist',
            p_workspace_id
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.workspace_heads
        WHERE workspace_heads.workspace_id =
                p_workspace_id
          AND workspace_heads.workspace_status =
                'active'
    ) THEN
        RAISE EXCEPTION
            'Workspace % is not active',
            p_workspace_id
            USING ERRCODE = '55000';
    END IF;

    IF NOT private.is_active_workspace_owner(
        p_workspace_id,
        authenticated_user_id
    ) THEN
        RAISE EXCEPTION
            'Only an active workspace owner may add members'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profile_heads
        WHERE profile_heads.user_id =
                p_user_id
          AND profile_heads.profile_status =
                'active'
    ) THEN
        RAISE EXCEPTION
            'User % does not have an active profile',
            p_user_id
            USING ERRCODE = '55000';
    END IF;

    SELECT
        workspace_membership_heads.*
    INTO current_membership_head
    FROM public.workspace_membership_heads
    WHERE workspace_membership_heads.workspace_id =
            p_workspace_id
      AND workspace_membership_heads.user_id =
            p_user_id
    FOR UPDATE;

    IF FOUND THEN
        IF current_membership_head.membership_status = 'active' THEN
            RAISE EXCEPTION
                'User % is already an active workspace member',
                p_user_id
                USING ERRCODE = '55000';
        END IF;

        IF current_membership_head.membership_status NOT IN (
            'left',
            'removed'
        ) THEN
            RAISE EXCEPTION
                'Only memberships that were left or removed may be reinstated'
                USING ERRCODE = '55000';
        END IF;

        SELECT
            workspace_membership_events.sequence_number
        INTO current_sequence_number
        FROM public.workspace_membership_events
        WHERE workspace_membership_events.workspace_membership_event_id =
                current_membership_head.latest_event_id;

        INSERT INTO public.workspace_membership_events (
            workspace_membership_id,
            workspace_id,
            user_id,
            sequence_number,
            event_type,
            role,
            performed_by
        )
        VALUES (
            current_membership_head.workspace_membership_id,
            current_membership_head.workspace_id,
            current_membership_head.user_id,
            current_sequence_number + 1,
            'reinstated',
            'member',
            authenticated_user_id
        )
        RETURNING *
        INTO new_membership_event;

        UPDATE public.workspace_membership_heads
        SET
            latest_event_id =
                new_membership_event.workspace_membership_event_id,
            membership_role =
                'member',
            membership_status =
                'active'
        WHERE workspace_membership_id =
            current_membership_head.workspace_membership_id
        RETURNING *
        INTO resulting_membership_head;

        RETURN resulting_membership_head;
    END IF;

    INSERT INTO public.workspace_memberships (
        workspace_id,
        user_id
    )
    VALUES (
        p_workspace_id,
        p_user_id
    )
    RETURNING *
    INTO new_workspace_membership;

    INSERT INTO public.workspace_membership_events (
        workspace_membership_id,
        workspace_id,
        user_id,
        sequence_number,
        event_type,
        role,
        performed_by
    )
    VALUES (
        new_workspace_membership.workspace_membership_id,
        new_workspace_membership.workspace_id,
        new_workspace_membership.user_id,
        1,
        'joined',
        'member',
        authenticated_user_id
    )
    RETURNING *
    INTO new_membership_event;

    INSERT INTO public.workspace_membership_heads (
        workspace_membership_id,
        workspace_id,
        user_id,
        latest_event_id,
        membership_role,
        membership_status
    )
    VALUES (
        new_workspace_membership.workspace_membership_id,
        new_workspace_membership.workspace_id,
        new_workspace_membership.user_id,
        new_membership_event.workspace_membership_event_id,
        'member',
        'active'
    )
    RETURNING *
    INTO resulting_membership_head;

    RETURN resulting_membership_head;
END;
$$;


COMMENT ON FUNCTION public.add_workspace_member(UUID, UUID) IS
    'Adds an active profile as a default member or reinstates its left/removed membership history. Only an active workspace owner may execute this command.';
