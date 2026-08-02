-- ============================================================================
-- Record voluntary workspace departure separately from owner-driven removal
-- ============================================================================
--
-- The immutable membership model defines `left` and `removed` as distinct
-- lifecycle outcomes. A member acting on their own authenticated identity
-- leaves; only an owner-driven command removes another member. The stable
-- membership identity and all final-owner protections remain unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.leave_workspace(
    p_workspace_id UUID
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

    new_membership_event
        public.workspace_membership_events;

    updated_membership_head
        public.workspace_membership_heads;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to leave a workspace'
            USING ERRCODE = '28000';
    END IF;

    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION
            'Workspace identifier is required'
            USING ERRCODE = '22023';
    END IF;

    -- Serialize workspace lifecycle and membership commands before reading
    -- either current state.
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

    SELECT
        workspace_membership_heads.*
    INTO current_membership_head
    FROM public.workspace_membership_heads
    WHERE workspace_membership_heads.workspace_id =
            p_workspace_id
      AND workspace_membership_heads.user_id =
            authenticated_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Authenticated user is not a member of workspace %',
            p_workspace_id
            USING ERRCODE = 'P0002';
    END IF;

    IF current_membership_head.membership_status <> 'active' THEN
        RAISE EXCEPTION
            'Only active workspace members may leave'
            USING ERRCODE = '55000';
    END IF;

    -- Lock every active owner before evaluating the invariant. This uses the
    -- same lock order as role changes and owner-driven removals.
    PERFORM 1
    FROM public.workspace_membership_heads
    WHERE workspace_membership_heads.workspace_id =
            p_workspace_id
      AND workspace_membership_heads.membership_role =
            'owner'
      AND workspace_membership_heads.membership_status =
            'active'
    FOR UPDATE;

    IF current_membership_head.membership_role = 'owner'
       AND private.count_active_workspace_owners(
            p_workspace_id
       ) <= 1 THEN
        RAISE EXCEPTION
            'The last active workspace owner cannot leave the workspace'
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
        performed_by,
        reason
    )
    VALUES (
        current_membership_head.workspace_membership_id,
        current_membership_head.workspace_id,
        current_membership_head.user_id,
        current_sequence_number + 1,
        'left',
        current_membership_head.membership_role,
        authenticated_user_id,
        NULL
    )
    RETURNING *
    INTO new_membership_event;

    UPDATE public.workspace_membership_heads
    SET
        latest_event_id =
            new_membership_event.workspace_membership_event_id,
        membership_status =
            'left'
    WHERE workspace_membership_id =
        current_membership_head.workspace_membership_id
    RETURNING *
    INTO updated_membership_head;

    RETURN updated_membership_head;
END;
$$;


COMMENT ON FUNCTION public.leave_workspace(UUID) IS
    'Marks the authenticated user as having left an active workspace while preserving at least one active owner.';
