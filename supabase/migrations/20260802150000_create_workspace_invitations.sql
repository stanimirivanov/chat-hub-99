-- ============================================================================
-- Consent-based workspace invitations
-- ============================================================================
--
-- Invitation identities and lifecycle events are immutable. A mutable head
-- selects the current event so pending uniqueness and recipient reads remain
-- efficient without rewriting invitation history.
-- ============================================================================

CREATE TABLE public.workspace_invitations (
    workspace_invitation_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(workspace_id)
        ON DELETE RESTRICT,
    invited_user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT workspace_invitations_identity_unique
        UNIQUE (
            workspace_invitation_id,
            workspace_id,
            invited_user_id
        )
);


CREATE TABLE public.workspace_invitation_events (
    workspace_invitation_event_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),
    workspace_invitation_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    invited_user_id UUID NOT NULL,
    sequence_number INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    performed_by UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT workspace_invitation_events_sequence_positive
        CHECK (sequence_number > 0),
    CONSTRAINT workspace_invitation_events_type_valid
        CHECK (event_type IN ('invited', 'accepted', 'declined')),
    CONSTRAINT workspace_invitation_events_sequence_unique
        UNIQUE (workspace_invitation_id, sequence_number),
    CONSTRAINT workspace_invitation_events_id_invitation_unique
        UNIQUE (
            workspace_invitation_event_id,
            workspace_invitation_id
        ),
    CONSTRAINT workspace_invitation_events_invitation_identity
        FOREIGN KEY (
            workspace_invitation_id,
            workspace_id,
            invited_user_id
        )
        REFERENCES public.workspace_invitations (
            workspace_invitation_id,
            workspace_id,
            invited_user_id
        )
        ON DELETE RESTRICT
);


CREATE TABLE public.workspace_invitation_heads (
    workspace_invitation_id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL,
    invited_user_id UUID NOT NULL,
    latest_event_id UUID NOT NULL,
    invitation_status TEXT NOT NULL,

    CONSTRAINT workspace_invitation_heads_status_valid
        CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
    CONSTRAINT workspace_invitation_heads_latest_event_unique
        UNIQUE (latest_event_id),
    CONSTRAINT workspace_invitation_heads_invitation_identity
        FOREIGN KEY (
            workspace_invitation_id,
            workspace_id,
            invited_user_id
        )
        REFERENCES public.workspace_invitations (
            workspace_invitation_id,
            workspace_id,
            invited_user_id
        )
        ON DELETE RESTRICT,
    CONSTRAINT workspace_invitation_heads_latest_event
        FOREIGN KEY (
            latest_event_id,
            workspace_invitation_id
        )
        REFERENCES public.workspace_invitation_events (
            workspace_invitation_event_id,
            workspace_invitation_id
        )
        ON DELETE RESTRICT
);


-- A user may be invited again after accepting or declining, but only one
-- invitation for that workspace/user pair may await a response at a time.
CREATE UNIQUE INDEX workspace_invitation_heads_pending_unique
ON public.workspace_invitation_heads (workspace_id, invited_user_id)
WHERE invitation_status = 'pending';


CREATE INDEX workspace_invitation_heads_recipient_idx
ON public.workspace_invitation_heads (invited_user_id, invitation_status);


CREATE INDEX workspace_invitation_events_history_idx
ON public.workspace_invitation_events (
    workspace_invitation_id,
    sequence_number DESC
);


CREATE TRIGGER workspace_invitations_prevent_mutation
BEFORE UPDATE OR DELETE
ON public.workspace_invitations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_row_mutation();


CREATE TRIGGER workspace_invitation_events_prevent_mutation
BEFORE UPDATE OR DELETE
ON public.workspace_invitation_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_row_mutation();


-- ============================================================================
-- Shared membership activation policy
-- ============================================================================
--
-- Both direct owner addition and recipient acceptance create or reinstate the
-- same default-member state. Callers must first lock and validate the active
-- workspace and authorize their own workflow. Keeping the transition here
-- prevents the two public commands from drifting apart.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.activate_workspace_member(
    p_workspace_id UUID,
    p_user_id UUID,
    p_performed_by UUID
)
RETURNS public.workspace_membership_heads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_membership_head public.workspace_membership_heads;
    current_sequence_number INTEGER;
    new_workspace_membership public.workspace_memberships;
    new_membership_event public.workspace_membership_events;
    resulting_membership_head public.workspace_membership_heads;
BEGIN
    SELECT workspace_membership_heads.*
    INTO current_membership_head
    FROM public.workspace_membership_heads
    WHERE workspace_membership_heads.workspace_id = p_workspace_id
      AND workspace_membership_heads.user_id = p_user_id
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
            'removed',
            'suspended'
        ) THEN
            RAISE EXCEPTION
                'Only left, removed, or suspended memberships may be reinstated'
                USING ERRCODE = '55000';
        END IF;

        SELECT workspace_membership_events.sequence_number
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
            p_performed_by
        )
        RETURNING * INTO new_membership_event;

        UPDATE public.workspace_membership_heads
        SET
            latest_event_id = new_membership_event.workspace_membership_event_id,
            membership_role = 'member',
            membership_status = 'active'
        WHERE workspace_membership_id =
            current_membership_head.workspace_membership_id
        RETURNING * INTO resulting_membership_head;

        RETURN resulting_membership_head;
    END IF;

    INSERT INTO public.workspace_memberships (workspace_id, user_id)
    VALUES (p_workspace_id, p_user_id)
    RETURNING * INTO new_workspace_membership;

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
        p_performed_by
    )
    RETURNING * INTO new_membership_event;

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
    RETURNING * INTO resulting_membership_head;

    RETURN resulting_membership_head;
END;
$$;


REVOKE ALL
ON FUNCTION private.activate_workspace_member(UUID, UUID, UUID)
FROM PUBLIC, anon, authenticated;


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
    resulting_membership_head public.workspace_membership_heads;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to add a workspace member'
            USING ERRCODE = '28000';
    END IF;

    IF p_workspace_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION
            'Workspace and user identifiers are required'
            USING ERRCODE = '22023';
    END IF;

    PERFORM 1
    FROM public.workspace_heads
    WHERE workspace_heads.workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
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
            'Only an active workspace owner may add members'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profile_heads
        WHERE profile_heads.user_id = p_user_id
          AND profile_heads.profile_status = 'active'
    ) THEN
        RAISE EXCEPTION
            'User % does not have an active profile', p_user_id
            USING ERRCODE = '55000';
    END IF;

    resulting_membership_head := private.activate_workspace_member(
        p_workspace_id,
        p_user_id,
        authenticated_user_id
    );

    RETURN resulting_membership_head;
END;
$$;


-- ============================================================================
-- Invitation commands and recipient query
-- ============================================================================

CREATE FUNCTION public.invite_workspace_member(
    p_workspace_id UUID,
    p_user_id UUID
)
RETURNS public.workspace_invitation_heads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;
    new_invitation public.workspace_invitations;
    new_event public.workspace_invitation_events;
    resulting_head public.workspace_invitation_heads;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to invite a workspace member'
            USING ERRCODE = '28000';
    END IF;

    IF p_workspace_id IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION
            'Workspace and user identifiers are required'
            USING ERRCODE = '22023';
    END IF;

    PERFORM 1
    FROM public.workspace_heads
    WHERE workspace_heads.workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
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
            'Only an active workspace owner may invite members'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profile_heads
        WHERE profile_heads.user_id = p_user_id
          AND profile_heads.profile_status = 'active'
    ) THEN
        RAISE EXCEPTION
            'User % does not have an active profile', p_user_id
            USING ERRCODE = '55000';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workspace_membership_heads
        WHERE workspace_membership_heads.workspace_id = p_workspace_id
          AND workspace_membership_heads.user_id = p_user_id
          AND workspace_membership_heads.membership_status = 'active'
    ) THEN
        RAISE EXCEPTION
            'User % is already an active workspace member', p_user_id
            USING ERRCODE = '55000';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workspace_invitation_heads
        WHERE workspace_invitation_heads.workspace_id = p_workspace_id
          AND workspace_invitation_heads.invited_user_id = p_user_id
          AND workspace_invitation_heads.invitation_status = 'pending'
    ) THEN
        RAISE EXCEPTION
            'User % already has a pending workspace invitation', p_user_id
            USING ERRCODE = '55000';
    END IF;

    INSERT INTO public.workspace_invitations (workspace_id, invited_user_id)
    VALUES (p_workspace_id, p_user_id)
    RETURNING * INTO new_invitation;

    INSERT INTO public.workspace_invitation_events (
        workspace_invitation_id,
        workspace_id,
        invited_user_id,
        sequence_number,
        event_type,
        performed_by
    )
    VALUES (
        new_invitation.workspace_invitation_id,
        new_invitation.workspace_id,
        new_invitation.invited_user_id,
        1,
        'invited',
        authenticated_user_id
    )
    RETURNING * INTO new_event;

    INSERT INTO public.workspace_invitation_heads (
        workspace_invitation_id,
        workspace_id,
        invited_user_id,
        latest_event_id,
        invitation_status
    )
    VALUES (
        new_invitation.workspace_invitation_id,
        new_invitation.workspace_id,
        new_invitation.invited_user_id,
        new_event.workspace_invitation_event_id,
        'pending'
    )
    RETURNING * INTO resulting_head;

    RETURN resulting_head;
END;
$$;


CREATE FUNCTION public.accept_workspace_invitation(
    p_workspace_invitation_id UUID
)
RETURNS public.workspace_membership_heads
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
    resulting_membership_head public.workspace_membership_heads;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to accept a workspace invitation'
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

    PERFORM 1
    FROM public.workspace_heads
    WHERE workspace_heads.workspace_id = invitation_workspace_id
    FOR UPDATE;

    SELECT workspace_invitation_heads.*
    INTO current_invitation_head
    FROM public.workspace_invitation_heads
    WHERE workspace_invitation_heads.workspace_invitation_id =
        p_workspace_invitation_id
    FOR UPDATE;

    IF current_invitation_head.invited_user_id <> authenticated_user_id THEN
        RAISE EXCEPTION
            'Only the invited user may accept this workspace invitation'
            USING ERRCODE = '42501';
    END IF;

    IF current_invitation_head.invitation_status <> 'pending' THEN
        RAISE EXCEPTION
            'Only a pending workspace invitation may be accepted'
            USING ERRCODE = '55000';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.workspace_heads
        WHERE workspace_heads.workspace_id = invitation_workspace_id
          AND workspace_heads.workspace_status = 'active'
    ) OR NOT EXISTS (
        SELECT 1
        FROM public.profile_heads
        WHERE profile_heads.user_id = authenticated_user_id
          AND profile_heads.profile_status = 'active'
    ) THEN
        RAISE EXCEPTION
            'The workspace invitation can no longer be accepted'
            USING ERRCODE = '55000';
    END IF;

    resulting_membership_head := private.activate_workspace_member(
        invitation_workspace_id,
        authenticated_user_id,
        authenticated_user_id
    );

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
        'accepted',
        authenticated_user_id
    )
    RETURNING * INTO new_event;

    UPDATE public.workspace_invitation_heads
    SET
        latest_event_id = new_event.workspace_invitation_event_id,
        invitation_status = 'accepted'
    WHERE workspace_invitation_id = p_workspace_invitation_id;

    RETURN resulting_membership_head;
END;
$$;


CREATE FUNCTION public.decline_workspace_invitation(
    p_workspace_invitation_id UUID
)
RETURNS public.workspace_invitation_heads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;
    current_invitation_head public.workspace_invitation_heads;
    current_sequence_number INTEGER;
    new_event public.workspace_invitation_events;
    resulting_head public.workspace_invitation_heads;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to decline a workspace invitation'
            USING ERRCODE = '28000';
    END IF;

    IF p_workspace_invitation_id IS NULL THEN
        RAISE EXCEPTION
            'Workspace invitation identifier is required'
            USING ERRCODE = '22023';
    END IF;

    SELECT workspace_invitation_heads.*
    INTO current_invitation_head
    FROM public.workspace_invitation_heads
    WHERE workspace_invitation_heads.workspace_invitation_id =
        p_workspace_invitation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Workspace invitation % does not exist',
            p_workspace_invitation_id
            USING ERRCODE = 'P0002';
    END IF;

    IF current_invitation_head.invited_user_id <> authenticated_user_id THEN
        RAISE EXCEPTION
            'Only the invited user may decline this workspace invitation'
            USING ERRCODE = '42501';
    END IF;

    IF current_invitation_head.invitation_status <> 'pending' THEN
        RAISE EXCEPTION
            'Only a pending workspace invitation may be declined'
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
        'declined',
        authenticated_user_id
    )
    RETURNING * INTO new_event;

    UPDATE public.workspace_invitation_heads
    SET
        latest_event_id = new_event.workspace_invitation_event_id,
        invitation_status = 'declined'
    WHERE workspace_invitation_id = p_workspace_invitation_id
    RETURNING * INTO resulting_head;

    RETURN resulting_head;
END;
$$;


CREATE FUNCTION public.list_pending_workspace_invitations()
RETURNS TABLE (
    workspace_invitation_id UUID,
    workspace_id UUID,
    invited_user_id UUID,
    invitation_status TEXT,
    workspace_name TEXT,
    workspace_slug TEXT,
    workspace_description TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        invitation_heads.workspace_invitation_id,
        invitation_heads.workspace_id,
        invitation_heads.invited_user_id,
        invitation_heads.invitation_status,
        workspace_versions.name AS workspace_name,
        workspace_versions.slug AS workspace_slug,
        workspace_versions.description AS workspace_description
    FROM public.workspace_invitation_heads AS invitation_heads
    INNER JOIN public.workspace_heads
        ON workspace_heads.workspace_id = invitation_heads.workspace_id
       AND workspace_heads.workspace_status = 'active'
    INNER JOIN public.workspace_versions
        ON workspace_versions.workspace_version_id =
            workspace_heads.workspace_version_id
    INNER JOIN public.profile_heads
        ON profile_heads.user_id = invitation_heads.invited_user_id
       AND profile_heads.profile_status = 'active'
    WHERE invitation_heads.invited_user_id = auth.uid()
      AND invitation_heads.invitation_status = 'pending'
    ORDER BY
        workspace_versions.name,
        invitation_heads.workspace_invitation_id;
$$;


-- ============================================================================
-- Invitation read policies and privileges
-- ============================================================================

CREATE FUNCTION private.can_read_workspace_invitation(
    p_workspace_id UUID,
    p_invited_user_id UUID,
    p_reader_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        p_invited_user_id = p_reader_user_id
        OR private.is_active_workspace_owner(
            p_workspace_id,
            p_reader_user_id
        );
$$;


REVOKE ALL
ON FUNCTION private.can_read_workspace_invitation(UUID, UUID, UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION private.can_read_workspace_invitation(UUID, UUID, UUID)
TO authenticated;


ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitation_heads ENABLE ROW LEVEL SECURITY;


CREATE POLICY workspace_invitations_authenticated_select
ON public.workspace_invitations
FOR SELECT
TO authenticated
USING (
    private.can_read_workspace_invitation(
        workspace_id,
        invited_user_id,
        (SELECT auth.uid())
    )
);


CREATE POLICY workspace_invitation_events_authenticated_select
ON public.workspace_invitation_events
FOR SELECT
TO authenticated
USING (
    private.can_read_workspace_invitation(
        workspace_id,
        invited_user_id,
        (SELECT auth.uid())
    )
);


CREATE POLICY workspace_invitation_heads_authenticated_select
ON public.workspace_invitation_heads
FOR SELECT
TO authenticated
USING (
    private.can_read_workspace_invitation(
        workspace_id,
        invited_user_id,
        (SELECT auth.uid())
    )
);


GRANT SELECT
ON TABLE
    public.workspace_invitations,
    public.workspace_invitation_events,
    public.workspace_invitation_heads
TO authenticated;


REVOKE ALL
ON TABLE
    public.workspace_invitations,
    public.workspace_invitation_events,
    public.workspace_invitation_heads
FROM anon;


REVOKE INSERT, UPDATE, DELETE
ON TABLE
    public.workspace_invitations,
    public.workspace_invitation_events,
    public.workspace_invitation_heads
FROM anon, authenticated;


REVOKE ALL ON FUNCTION public.invite_workspace_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_workspace_invitation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decline_workspace_invitation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_pending_workspace_invitations() FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.invite_workspace_member(UUID, UUID)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(UUID)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_workspace_invitation(UUID)
TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_workspace_invitations()
TO authenticated;


COMMENT ON TABLE public.workspace_invitations IS
    'Stable immutable identities for consent-based workspace invitations.';
COMMENT ON TABLE public.workspace_invitation_events IS
    'Append-only invited, accepted, and declined invitation lifecycle events.';
COMMENT ON TABLE public.workspace_invitation_heads IS
    'Mutable current-state projection for immutable workspace invitation history.';
COMMENT ON FUNCTION private.activate_workspace_member(UUID, UUID, UUID) IS
    'Creates or reinstates a default-member relationship. Callers must first lock and validate the workspace and authorize the workflow.';
COMMENT ON FUNCTION public.invite_workspace_member(UUID, UUID) IS
    'Creates one pending invitation for an active non-member. Only an active workspace owner may execute this command.';
COMMENT ON FUNCTION public.accept_workspace_invitation(UUID) IS
    'Accepts the authenticated recipient pending invitation and transactionally creates or reinstates default-member access.';
COMMENT ON FUNCTION public.decline_workspace_invitation(UUID) IS
    'Declines the authenticated recipient pending invitation without changing membership.';
COMMENT ON FUNCTION public.list_pending_workspace_invitations() IS
    'Lists pending invitations addressed to the authenticated active profile with current active workspace presentation details.';
