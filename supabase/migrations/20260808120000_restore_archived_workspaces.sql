-- ============================================================================
-- Restore archived workspaces
-- ============================================================================
--
-- Restoration appends a new active immutable version. Stable workspace and
-- membership identities remain unchanged. Workspace lifecycle transitions
-- also invalidate every active member's workspace navigation projection so
-- archive and restore commands reconcile in other authenticated clients.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.restore_workspace(
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
    restored_workspace_version public.workspace_versions;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to restore a workspace'
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
            'Only active workspace owners may restore the workspace'
            USING ERRCODE = '42501';
    END IF;

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

    IF current_workspace_version.status <> 'archived' THEN
        RAISE EXCEPTION
            'Only archived workspaces can be restored'
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
        current_workspace_version.workspace_id,
        current_workspace_version.version_number + 1,
        current_workspace_version.name,
        current_workspace_version.slug,
        current_workspace_version.description,
        'active',
        current_workspace_version.workspace_version_id,
        authenticated_user_id
    )
    RETURNING *
    INTO restored_workspace_version;

    UPDATE public.workspace_heads
    SET
        workspace_version_id =
            restored_workspace_version.workspace_version_id,
        current_name = restored_workspace_version.name,
        current_slug = restored_workspace_version.slug,
        workspace_status = restored_workspace_version.status
    WHERE workspace_id = p_workspace_id;

    RETURN restored_workspace_version;
END;
$$;


COMMENT ON FUNCTION public.restore_workspace(UUID) IS
    'Appends an active immutable snapshot for an archived workspace and atomically advances its head.';


REVOKE ALL
ON FUNCTION public.restore_workspace(UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.restore_workspace(UUID)
TO authenticated;


-- ============================================================================
-- Workspace lifecycle realtime invalidation
-- ============================================================================

CREATE OR REPLACE FUNCTION private.broadcast_workspace_lifecycle_access_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    affected_user_id UUID;
BEGIN
    FOR affected_user_id IN
        SELECT workspace_membership_heads.user_id
        FROM public.workspace_membership_heads
        WHERE workspace_membership_heads.workspace_id = NEW.workspace_id
          AND workspace_membership_heads.membership_status = 'active'
    LOOP
        PERFORM realtime.send(
            jsonb_build_object(
                'workspace_id', NEW.workspace_id::TEXT
            ),
            'changed',
            'workspace-access:' || affected_user_id::TEXT,
            TRUE
        );
    END LOOP;

    RETURN NULL;
END;
$$;


REVOKE ALL
ON FUNCTION private.broadcast_workspace_lifecycle_access_change()
FROM PUBLIC;


CREATE TRIGGER workspace_heads_broadcast_lifecycle_access_change
AFTER UPDATE OF workspace_status
ON public.workspace_heads
FOR EACH ROW
WHEN (OLD.workspace_status IS DISTINCT FROM NEW.workspace_status)
EXECUTE FUNCTION private.broadcast_workspace_lifecycle_access_change();


COMMENT ON FUNCTION private.broadcast_workspace_lifecycle_access_change() IS
    'Broadcasts workspace-access invalidations to active members after archive or restoration changes workspace visibility.';


COMMENT ON TRIGGER workspace_heads_broadcast_lifecycle_access_change
ON public.workspace_heads IS
    'Invalidates active-member workspace navigation after a workspace lifecycle transition.';
