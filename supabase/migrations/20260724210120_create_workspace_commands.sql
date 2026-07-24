-- ============================================================================
-- Immutable workspace command layer
-- ============================================================================
--
-- This migration provides the transactional commands through which application
-- clients create and modify workspaces.
--
-- The underlying model separates:
--
--   public.workspaces
--       Stable workspace identity.
--
--   public.workspace_versions
--       Append-only immutable workspace snapshots.
--
--   public.workspace_heads
--       Mutable projection identifying the current workspace version.
--
--   public.workspace_memberships
--       Stable identity of a user/workspace relationship.
--
--   public.workspace_membership_events
--       Append-only membership lifecycle history.
--
--   public.workspace_membership_heads
--       Mutable projection of current membership state.
--
-- Clients must use these functions rather than coordinating table writes
-- themselves. Each function performs all required writes atomically.
--
-- SECURITY DEFINER is required because authenticated clients will not receive
-- direct write privileges on the underlying tables. Every relation is therefore
-- schema-qualified and the function search path is empty.
-- ============================================================================


-- ============================================================================
-- Create workspace
-- ============================================================================

-- Creates a workspace and its initial owner membership.
--
-- The authenticated user becomes the first active owner. A workspace is never
-- created without at least one owner.
CREATE OR REPLACE FUNCTION public.create_workspace(
    p_name TEXT,
    p_slug TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS public.workspace_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;

    normalized_name TEXT;
    normalized_slug TEXT;
    normalized_description TEXT;

    new_workspace_id UUID;
    new_workspace_version public.workspace_versions;

    new_membership_id UUID;
    new_membership_event_id UUID;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to create a workspace'
            USING ERRCODE = '28000';
    END IF;

    -- Only active profiles may create workspaces.
    IF NOT EXISTS (
        SELECT 1
        FROM public.profile_heads
        WHERE profile_heads.user_id = authenticated_user_id
        AND profile_heads.profile_status = 'active'
    ) THEN
        RAISE EXCEPTION
            'Only active profiles may create workspaces'
            USING ERRCODE = '42501';
    END IF;

    normalized_name := trim(p_name);
    normalized_slug := lower(trim(p_slug));
    normalized_description :=
        NULLIF(
            trim(p_description),
            ''
        );

    IF normalized_name = '' THEN
        RAISE EXCEPTION
            'Workspace name must not be blank'
            USING ERRCODE = '22023';
    END IF;

    IF normalized_slug = '' THEN
        RAISE EXCEPTION
            'Workspace slug must not be blank'
            USING ERRCODE = '22023';
    END IF;

    IF normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
        RAISE EXCEPTION
            'Workspace slug must contain lowercase letters, digits, and single hyphens only'
            USING ERRCODE = '22023';
    END IF;

    -- ------------------------------------------------------------------------
    -- Stable workspace identity
    -- ------------------------------------------------------------------------

    INSERT INTO public.workspaces (
        created_by
    )
    VALUES (
        authenticated_user_id
    )
    RETURNING workspace_id
    INTO new_workspace_id;

    -- ------------------------------------------------------------------------
    -- Initial immutable workspace snapshot
    -- ------------------------------------------------------------------------

    INSERT INTO public.workspace_versions (
        workspace_id,
        version_number,
        name,
        slug,
        description,
        status,
        supersedes_workspace_version_id,
        created_by
    )
    VALUES (
        new_workspace_id,
        1,
        normalized_name,
        normalized_slug,
        normalized_description,
        'active',
        NULL,
        authenticated_user_id
    )
    RETURNING *
    INTO new_workspace_version;

    -- ------------------------------------------------------------------------
    -- Current workspace projection
    -- ------------------------------------------------------------------------

    INSERT INTO public.workspace_heads (
        workspace_id,
        workspace_version_id,
        current_name,
        current_slug,
        workspace_status
    )
    VALUES (
        new_workspace_id,
        new_workspace_version.workspace_version_id,
        new_workspace_version.name,
        new_workspace_version.slug,
        new_workspace_version.status
    );

    -- ------------------------------------------------------------------------
    -- Stable owner-membership identity
    -- ------------------------------------------------------------------------

    INSERT INTO public.workspace_memberships (
        workspace_id,
        user_id
    )
    VALUES (
        new_workspace_id,
        authenticated_user_id
    )
    RETURNING workspace_membership_id
    INTO new_membership_id;

    -- ------------------------------------------------------------------------
    -- Initial immutable membership event
    -- ------------------------------------------------------------------------

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
        new_membership_id,
        new_workspace_id,
        authenticated_user_id,
        1,
        'joined',
        'owner',
        authenticated_user_id,
        'Workspace creator'
    )
    RETURNING workspace_membership_event_id
    INTO new_membership_event_id;

    -- ------------------------------------------------------------------------
    -- Current membership projection
    -- ------------------------------------------------------------------------

    INSERT INTO public.workspace_membership_heads (
        workspace_membership_id,
        workspace_id,
        user_id,
        latest_event_id,
        membership_role,
        membership_status
    )
    VALUES (
        new_membership_id,
        new_workspace_id,
        authenticated_user_id,
        new_membership_event_id,
        'owner',
        'active'
    );

    RETURN new_workspace_version;
END;
$$;


COMMENT ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT) IS
    'Creates a workspace, its first immutable version, its current head, and an active owner membership for the authenticated user.';


-- ============================================================================
-- Update workspace
-- ============================================================================

-- Appends a new immutable workspace version.
--
-- Only an active workspace owner may call this command.
--
-- This function replaces the complete mutable portion of the workspace
-- snapshot. The caller therefore supplies the resulting name, slug, and
-- description rather than a partial patch.
CREATE OR REPLACE FUNCTION public.update_workspace(
    p_workspace_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS public.workspace_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;

    normalized_name TEXT;
    normalized_slug TEXT;
    normalized_description TEXT;

    current_workspace_version_id UUID;
    current_version_number INTEGER;
    workspace_status  TEXT;

    new_workspace_version public.workspace_versions;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to update a workspace'
            USING ERRCODE = '28000';
    END IF;

    normalized_name := trim(p_name);
    normalized_slug := lower(trim(p_slug));
    normalized_description :=
        NULLIF(
            trim(p_description),
            ''
        );

    IF normalized_name = '' THEN
        RAISE EXCEPTION
            'Workspace name must not be blank'
            USING ERRCODE = '22023';
    END IF;

    IF normalized_slug = '' THEN
        RAISE EXCEPTION
            'Workspace slug must not be blank'
            USING ERRCODE = '22023';
    END IF;

    IF normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
        RAISE EXCEPTION
            'Workspace slug must contain lowercase letters, digits, and single hyphens only'
            USING ERRCODE = '22023';
    END IF;

    -- Authorization is evaluated from the current membership projection.
    IF NOT EXISTS (
        SELECT 1
        FROM public.workspace_membership_heads
        WHERE workspace_id = p_workspace_id
          AND user_id = authenticated_user_id
          AND membership_role = 'owner'
          AND membership_status = 'active'
    ) THEN
        RAISE EXCEPTION
            'Only active workspace owners may update the workspace'
            USING ERRCODE = '42501';
    END IF;

    -- Lock the head so concurrent updates cannot both create the same next
    -- version or produce competing successors.
    SELECT
        workspace_heads.workspace_version_id,
        workspace_versions.version_number,
        workspace_heads.workspace_status
    INTO
        current_workspace_version_id,
        current_version_number,
        workspace_status
    FROM public.workspace_heads
    INNER JOIN public.workspace_versions
        ON workspace_versions.workspace_version_id =
            workspace_heads.workspace_version_id
        AND workspace_versions.workspace_id =
            workspace_heads.workspace_id
    WHERE workspace_heads.workspace_id = p_workspace_id
    FOR UPDATE OF workspace_heads;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Workspace not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF workspace_status <> 'active' THEN
        RAISE EXCEPTION
            'Archived workspaces cannot be updated'
            USING ERRCODE = '55000';
    END IF;

    INSERT INTO public.workspace_versions (
        workspace_id,
        version_number,
        name,
        slug,
        description,
        status,
        supersedes_workspace_version_id,
        created_by
    )
    VALUES (
        p_workspace_id,
        current_version_number + 1,
        normalized_name,
        normalized_slug,
        normalized_description,
        workspace_status,
        current_workspace_version_id,
        authenticated_user_id
    )
    RETURNING *
    INTO new_workspace_version;

    UPDATE public.workspace_heads
    SET
        workspace_version_id =
            new_workspace_version.workspace_version_id,
        current_name =
            new_workspace_version.name,
        current_slug =
            new_workspace_version.slug,
        workspace_status =
            new_workspace_version.status
    WHERE workspace_id = p_workspace_id;

    RETURN new_workspace_version;
END;
$$;


COMMENT ON FUNCTION public.update_workspace(UUID, TEXT, TEXT, TEXT) IS
    'Appends an immutable workspace snapshot and atomically advances the current workspace head.';


-- ============================================================================
-- Archive workspace
-- ============================================================================

-- Archiving is represented by a new immutable workspace version.
--
-- The existing workspace and its historical versions remain untouched.
-- Archived workspaces cannot be updated through update_workspace.
CREATE OR REPLACE FUNCTION public.archive_workspace(
    p_workspace_id UUID
)
RETURNS public.workspace_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;

    current_workspace_version public.workspace_versions;
    new_workspace_version public.workspace_versions;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to archive a workspace'
            USING ERRCODE = '28000';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.workspace_membership_heads
        WHERE workspace_id = p_workspace_id
          AND user_id = authenticated_user_id
          AND membership_role = 'owner'
          AND membership_status = 'active'
    ) THEN
        RAISE EXCEPTION
            'Only active workspace owners may archive the workspace'
            USING ERRCODE = '42501';
    END IF;

    -- Lock the current head and load its immutable snapshot.
    SELECT workspace_versions.*
    INTO current_workspace_version
    FROM public.workspace_heads
    INNER JOIN public.workspace_versions
        ON workspace_versions.workspace_version_id =
            workspace_heads.workspace_version_id
        AND workspace_versions.workspace_id =
            workspace_heads.workspace_id
    WHERE workspace_heads.workspace_id = p_workspace_id
    FOR UPDATE OF workspace_heads;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Workspace not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF current_workspace_version.status = 'archived' THEN
        RAISE EXCEPTION
            'Workspace is already archived'
            USING ERRCODE = '55000';
    END IF;

    -- Copy the current descriptive state and change only the lifecycle status.
    INSERT INTO public.workspace_versions (
        workspace_id,
        version_number,
        name,
        slug,
        description,
        status,
        supersedes_workspace_version_id,
        created_by
    )
    VALUES (
        current_workspace_version.workspace_id,
        current_workspace_version.version_number + 1,
        current_workspace_version.name,
        current_workspace_version.slug,
        current_workspace_version.description,
        'archived',
        current_workspace_version.workspace_version_id,
        authenticated_user_id
    )
    RETURNING *
    INTO new_workspace_version;

    UPDATE public.workspace_heads
    SET
        workspace_version_id =
            new_workspace_version.workspace_version_id,
        current_name =
            new_workspace_version.name,
        current_slug =
            new_workspace_version.slug,
        workspace_status =
            new_workspace_version.status
    WHERE workspace_id = p_workspace_id;

    RETURN new_workspace_version;
END;
$$;


COMMENT ON FUNCTION public.archive_workspace(UUID) IS
    'Appends an archived immutable workspace snapshot and atomically advances the workspace head.';


-- ============================================================================
-- Direct write restrictions
-- ============================================================================

-- Application roles must not bypass the command layer.
REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspaces
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_versions
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_heads
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_memberships
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_membership_events
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.workspace_membership_heads
FROM anon, authenticated;


-- Functions are executable by PUBLIC by default, so explicitly revoke before
-- granting access to authenticated users.
REVOKE ALL
ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.update_workspace(UUID, TEXT, TEXT, TEXT)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.archive_workspace(UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.create_workspace(TEXT, TEXT, TEXT)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.update_workspace(UUID, TEXT, TEXT, TEXT)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.archive_workspace(UUID)
TO authenticated;


-- ============================================================================
-- Current workspace read model
-- ============================================================================

-- Applications should normally read current workspace state through this view
-- rather than manually joining the stable identity, head, and version tables.
CREATE VIEW public.current_workspaces
WITH (security_invoker = TRUE)
AS
SELECT
    workspaces.workspace_id,
    workspace_versions.name,
    workspace_versions.slug,
    workspace_versions.description,
    workspace_versions.status,
    workspace_versions.version_number,
    workspaces.created_by,
    workspaces.created_at,
    workspace_versions.created_by AS version_created_by,
    workspace_versions.created_at AS version_created_at
FROM public.workspaces
INNER JOIN public.workspace_heads
    ON workspace_heads.workspace_id =
        workspaces.workspace_id
INNER JOIN public.workspace_versions
    ON workspace_versions.workspace_version_id =
        workspace_heads.workspace_version_id
    AND workspace_versions.workspace_id =
        workspace_heads.workspace_id;


COMMENT ON VIEW public.current_workspaces IS
    'Current workspace read model assembled from stable identities, mutable heads, and immutable workspace versions.';


GRANT SELECT
ON TABLE public.current_workspaces
TO authenticated;