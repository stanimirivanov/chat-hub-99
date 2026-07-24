-- ============================================================================
-- Workspace membership command layer
-- ============================================================================
--
-- This migration exposes transactional commands for the initial workspace
-- membership lifecycle:
--
--   - add_workspace_member
--   - change_workspace_member_role
--   - remove_workspace_member
--
-- Membership history remains immutable:
--
--   workspace_memberships
--       Stable identity of the user/workspace relationship.
--
--   workspace_membership_events
--       Append-only lifecycle history.
--
--   workspace_membership_heads
--       Mutable current-state projection.
--
-- Application roles must use these commands rather than writing directly to
-- membership tables.
-- ============================================================================


-- ============================================================================
-- Authorization helpers
-- ============================================================================

CREATE OR REPLACE FUNCTION private.is_active_workspace_owner(
    p_workspace_id UUID,
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
        WHERE workspace_membership_heads.workspace_id =
                p_workspace_id
          AND workspace_membership_heads.user_id =
                p_user_id
          AND workspace_membership_heads.membership_role =
                'owner'
          AND workspace_membership_heads.membership_status =
                'active'
          AND workspace_heads.workspace_status =
                'active'
    );
$$;


CREATE OR REPLACE FUNCTION private.count_active_workspace_owners(
    p_workspace_id UUID
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT count(*)
    FROM public.workspace_membership_heads
    WHERE workspace_membership_heads.workspace_id =
            p_workspace_id
      AND workspace_membership_heads.membership_role =
            'owner'
      AND workspace_membership_heads.membership_status =
            'active';
$$;


REVOKE ALL
ON FUNCTION private.is_active_workspace_owner(UUID, UUID)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION private.count_active_workspace_owners(UUID)
FROM PUBLIC;


-- ============================================================================
-- Add workspace member
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

    new_workspace_membership
        public.workspace_memberships;

    new_membership_event
        public.workspace_membership_events;

    new_membership_head
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

    -- Lock the workspace projection so that membership commands cannot race
    -- with workspace archival.
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

    IF EXISTS (
        SELECT 1
        FROM public.workspace_memberships
        WHERE workspace_memberships.workspace_id =
                p_workspace_id
          AND workspace_memberships.user_id =
                p_user_id
    ) THEN
        RAISE EXCEPTION
            'User % already has a membership history in workspace %',
            p_user_id,
            p_workspace_id
            USING ERRCODE = '23505';
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
    INTO new_membership_head;

    RETURN new_membership_head;
END;
$$;


-- ============================================================================
-- Change workspace member role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.change_workspace_member_role(
    p_workspace_id UUID,
    p_user_id UUID,
    p_role TEXT
)
RETURNS public.workspace_membership_heads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;
    normalized_role TEXT;

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
            'Authentication is required to change a workspace member role'
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

    normalized_role := lower(trim(p_role));

    IF normalized_role NOT IN (
        'owner',
        'member'
    ) THEN
        RAISE EXCEPTION
            'Workspace role must be owner or member'
            USING ERRCODE = '22023';
    END IF;

    -- Lock the workspace before checking its status.
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
            'Only an active workspace owner may change member roles'
            USING ERRCODE = '42501';
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

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'User % is not a member of workspace %',
            p_user_id,
            p_workspace_id
            USING ERRCODE = 'P0002';
    END IF;

    IF current_membership_head.membership_status <> 'active' THEN
        RAISE EXCEPTION
            'Only active workspace memberships may change role'
            USING ERRCODE = '55000';
    END IF;

    IF current_membership_head.membership_role =
        normalized_role THEN
        RAISE EXCEPTION
            'Workspace member already has role %',
            normalized_role
            USING ERRCODE = '55000';
    END IF;

    -- Lock all active owner heads before evaluating the last-owner invariant.
    --
    -- This serializes concurrent owner demotions and removals.
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
       AND normalized_role = 'member'
       AND private.count_active_workspace_owners(
            p_workspace_id
       ) <= 1 THEN
        RAISE EXCEPTION
            'The last active workspace owner cannot be demoted'
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
        'role_changed',
        normalized_role,
        authenticated_user_id
    )
    RETURNING *
    INTO new_membership_event;

    UPDATE public.workspace_membership_heads
    SET
        latest_event_id =
            new_membership_event.workspace_membership_event_id,
        membership_role =
            new_membership_event.role
    WHERE workspace_membership_id =
        current_membership_head.workspace_membership_id
    RETURNING *
    INTO updated_membership_head;

    RETURN updated_membership_head;
END;
$$;


-- ============================================================================
-- Remove workspace member
-- ============================================================================

CREATE OR REPLACE FUNCTION public.remove_workspace_member(
    p_workspace_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS public.workspace_membership_heads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;
    normalized_reason TEXT;

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
            'Authentication is required to remove a workspace member'
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

    IF authenticated_user_id = p_user_id THEN
        RAISE EXCEPTION
            'Workspace owners cannot remove themselves with this command'
            USING ERRCODE = '55000';
    END IF;

    normalized_reason :=
        NULLIF(
            trim(p_reason),
            ''
        );

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
            'Only an active workspace owner may remove members'
            USING ERRCODE = '42501';
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

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'User % is not a member of workspace %',
            p_user_id,
            p_workspace_id
            USING ERRCODE = 'P0002';
    END IF;

    IF current_membership_head.membership_status <> 'active' THEN
        RAISE EXCEPTION
            'Only an active workspace member may be removed'
            USING ERRCODE = '55000';
    END IF;

    -- Lock all active owners before checking the invariant.
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
            'The last active workspace owner cannot be removed'
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
        'removed',
        current_membership_head.membership_role,
        authenticated_user_id,
        normalized_reason
    )
    RETURNING *
    INTO new_membership_event;

    UPDATE public.workspace_membership_heads
    SET
        latest_event_id =
            new_membership_event.workspace_membership_event_id,
        membership_status =
            'removed'
    WHERE workspace_membership_id =
        current_membership_head.workspace_membership_id
    RETURNING *
    INTO updated_membership_head;

    RETURN updated_membership_head;
END;
$$;


-- ============================================================================
-- Current membership projection
-- ============================================================================

CREATE OR REPLACE VIEW public.current_workspace_memberships
WITH (security_invoker = true)
AS
SELECT
    workspace_memberships.workspace_membership_id,
    workspace_memberships.workspace_id,
    workspace_memberships.user_id,

    workspace_membership_heads.membership_role,
    workspace_membership_heads.membership_status,

    workspace_membership_events.workspace_membership_event_id
        AS latest_event_id,

    workspace_membership_events.sequence_number
        AS latest_event_sequence_number,

    workspace_membership_events.event_type
        AS latest_event_type,

    workspace_membership_events.performed_by
        AS latest_event_performed_by,

    workspace_membership_events.reason
        AS latest_event_reason,

    workspace_memberships.created_at
        AS membership_created_at,

    workspace_membership_events.created_at
        AS latest_event_created_at
FROM public.workspace_memberships
INNER JOIN public.workspace_membership_heads
    ON workspace_membership_heads.workspace_membership_id =
        workspace_memberships.workspace_membership_id
INNER JOIN public.workspace_membership_events
    ON workspace_membership_events.workspace_membership_event_id =
        workspace_membership_heads.latest_event_id
   AND workspace_membership_events.workspace_membership_id =
        workspace_membership_heads.workspace_membership_id;


-- ============================================================================
-- Privileges
-- ============================================================================

REVOKE ALL
ON TABLE public.workspace_memberships
FROM anon, authenticated;


REVOKE ALL
ON TABLE public.workspace_membership_events
FROM anon, authenticated;


REVOKE ALL
ON TABLE public.workspace_membership_heads
FROM anon, authenticated;


REVOKE ALL
ON FUNCTION public.add_workspace_member(UUID, UUID)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.change_workspace_member_role(UUID, UUID, TEXT)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.remove_workspace_member(UUID, UUID, TEXT)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.add_workspace_member(UUID, UUID)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.change_workspace_member_role(UUID, UUID, TEXT)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.remove_workspace_member(UUID, UUID, TEXT)
TO authenticated;


REVOKE ALL
ON public.current_workspace_memberships
FROM anon, authenticated;


-- Direct read access will be introduced together with Row Level Security.
-- Until then, internal membership state remains accessible only to trusted
-- database code.


-- ============================================================================
-- PostgreSQL documentation
-- ============================================================================

COMMENT ON FUNCTION public.add_workspace_member(UUID, UUID) IS
    'Adds an active profile to an active workspace as a member. Only an active workspace owner may execute this command.';


COMMENT ON FUNCTION public.change_workspace_member_role(UUID, UUID, TEXT) IS
    'Appends a role_changed membership event and advances the membership head. The last active workspace owner cannot be demoted.';


COMMENT ON FUNCTION public.remove_workspace_member(UUID, UUID, TEXT) IS
    'Appends a removed membership event and marks the membership head as removed. The last active workspace owner cannot be removed.';


COMMENT ON VIEW public.current_workspace_memberships IS
    'Current workspace membership projection resolved from stable membership identities, mutable heads, and latest immutable events.';