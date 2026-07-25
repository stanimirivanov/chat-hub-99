-- ============================================================================
-- Channel command layer
-- ============================================================================
--
-- Commands:
--
--   create_channel(...)
--       Creates the stable channel identity, initial immutable version, and
--       mutable head.
--
--   update_channel(...)
--       Appends a new immutable version and advances the channel head.
--
--   archive_channel(...)
--       Changes only the mutable lifecycle state in channel_heads.
--
-- Authorization:
--
--   - active workspace members may create public channels;
--   - active workspace owners may update channels;
--   - active workspace owners may archive channels;
--   - archived workspaces reject all channel mutations;
--   - archived channels cannot be updated or archived again.
--
-- Application roles receive EXECUTE only. They do not receive direct write
-- privileges on channel tables.
-- ============================================================================


-- ============================================================================
-- Create channel
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_channel(
    p_workspace_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_user_id UUID;
    v_channel_id UUID;
    v_channel_version_id UUID;
    v_normalized_name TEXT;
    v_normalized_slug TEXT;
    v_normalized_description TEXT;
BEGIN
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to create a channel'
            USING ERRCODE = '42501';
    END IF;

    IF p_workspace_id IS NULL THEN
        RAISE EXCEPTION
            'Workspace ID is required'
            USING ERRCODE = '22004';
    END IF;

    v_normalized_name := btrim(p_name);
    v_normalized_slug := lower(btrim(p_slug));
    v_normalized_description := NULLIF(btrim(p_description), '');

    IF v_normalized_name IS NULL
       OR v_normalized_name = '' THEN
        RAISE EXCEPTION
            'Channel name must not be blank'
            USING ERRCODE = '22023';
    END IF;

    IF v_normalized_slug IS NULL
       OR v_normalized_slug = '' THEN
        RAISE EXCEPTION
            'Channel slug must not be blank'
            USING ERRCODE = '22023';
    END IF;

    IF v_normalized_slug !~
        '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    THEN
        RAISE EXCEPTION
            'Channel slug must contain lowercase letters, numbers, and single hyphens only'
            USING ERRCODE = '22023';
    END IF;

    -- Lock the workspace head so the workspace cannot transition to archived
    -- during this command.
    PERFORM 1
    FROM public.workspace_heads
    WHERE workspace_id = p_workspace_id
      AND workspace_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Workspace % does not exist or is archived',
            p_workspace_id
            USING ERRCODE = '55000';
    END IF;

    IF NOT private.is_active_workspace_member(
        p_workspace_id,
        v_actor_user_id
    ) THEN
        RAISE EXCEPTION
            'Only active workspace members may create channels'
            USING ERRCODE = '42501';
    END IF;

    v_channel_id := gen_random_uuid();
    v_channel_version_id := gen_random_uuid();

    INSERT INTO public.channels (
        channel_id,
        workspace_id,
        slug,
        created_by
    )
    VALUES (
        v_channel_id,
        p_workspace_id,
        v_normalized_slug,
        v_actor_user_id
    );

    INSERT INTO public.channel_versions (
        channel_version_id,
        channel_id,
        version_number,
        name,
        description,
        created_by
    )
    VALUES (
        v_channel_version_id,
        v_channel_id,
        1,
        v_normalized_name,
        v_normalized_description,
        v_actor_user_id
    );

    INSERT INTO public.channel_heads (
        channel_id,
        workspace_id,
        latest_channel_version_id,
        latest_version_number,
        channel_status
    )
    VALUES (
        v_channel_id,
        p_workspace_id,
        v_channel_version_id,
        1,
        'active'
    );

    RETURN v_channel_id;

EXCEPTION
    WHEN unique_violation THEN
        IF EXISTS (
            SELECT 1
            FROM public.channels
            WHERE workspace_id = p_workspace_id
              AND slug = v_normalized_slug
        ) THEN
            RAISE EXCEPTION
                'Channel slug "%" already exists in workspace %',
                v_normalized_slug,
                p_workspace_id
                USING ERRCODE = '23505';
        END IF;

        RAISE;
END;
$$;


COMMENT ON FUNCTION public.create_channel(
    UUID,
    TEXT,
    TEXT,
    TEXT
) IS
    'Creates a public workspace channel. Active workspace membership is required.';


-- ============================================================================
-- Update channel
-- ============================================================================
--
-- The stable workspace association and slug do not change.
--
-- A successful update:
--
--   1. locks the channel head;
--   2. validates workspace and channel state;
--   3. appends the next immutable version;
--   4. advances the channel head.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_channel(
    p_channel_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_user_id UUID;
    v_workspace_id UUID;
    v_current_version_number INTEGER;
    v_next_version_number INTEGER;
    v_channel_version_id UUID;
    v_normalized_name TEXT;
    v_normalized_description TEXT;
BEGIN
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to update a channel'
            USING ERRCODE = '42501';
    END IF;

    IF p_channel_id IS NULL THEN
        RAISE EXCEPTION
            'Channel ID is required'
            USING ERRCODE = '22004';
    END IF;

    v_normalized_name := btrim(p_name);
    v_normalized_description := NULLIF(btrim(p_description), '');

    IF v_normalized_name IS NULL
       OR v_normalized_name = '' THEN
        RAISE EXCEPTION
            'Channel name must not be blank'
            USING ERRCODE = '22023';
    END IF;

    SELECT
        channel_heads.workspace_id,
        channel_heads.latest_version_number
    INTO
        v_workspace_id,
        v_current_version_number
    FROM public.channel_heads
    WHERE channel_heads.channel_id = p_channel_id
      AND channel_heads.channel_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Channel % does not exist or is archived',
            p_channel_id
            USING ERRCODE = '55000';
    END IF;

    -- Lock and validate the workspace after resolving it from the stable
    -- channel aggregate.
    PERFORM 1
    FROM public.workspace_heads
    WHERE workspace_id = v_workspace_id
      AND workspace_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Workspace % is archived',
            v_workspace_id
            USING ERRCODE = '55000';
    END IF;

    IF NOT private.is_active_workspace_owner(
        v_workspace_id,
        v_actor_user_id
    ) THEN
        RAISE EXCEPTION
            'Only active workspace owners may update channels'
            USING ERRCODE = '42501';
    END IF;

    v_next_version_number := v_current_version_number + 1;
    v_channel_version_id := gen_random_uuid();

    INSERT INTO public.channel_versions (
        channel_version_id,
        channel_id,
        version_number,
        name,
        description,
        created_by
    )
    VALUES (
        v_channel_version_id,
        p_channel_id,
        v_next_version_number,
        v_normalized_name,
        v_normalized_description,
        v_actor_user_id
    );

    UPDATE public.channel_heads
    SET
        latest_channel_version_id = v_channel_version_id,
        latest_version_number = v_next_version_number,
        updated_at = statement_timestamp()
    WHERE channel_id = p_channel_id;

    RETURN v_channel_version_id;
END;
$$;


COMMENT ON FUNCTION public.update_channel(
    UUID,
    TEXT,
    TEXT
) IS
    'Appends a new immutable channel version. Active workspace ownership is required.';


-- ============================================================================
-- Archive channel
-- ============================================================================

CREATE OR REPLACE FUNCTION public.archive_channel(
    p_channel_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_user_id UUID;
    v_workspace_id UUID;
BEGIN
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to archive a channel'
            USING ERRCODE = '42501';
    END IF;

    IF p_channel_id IS NULL THEN
        RAISE EXCEPTION
            'Channel ID is required'
            USING ERRCODE = '22004';
    END IF;

    SELECT channel_heads.workspace_id
    INTO v_workspace_id
    FROM public.channel_heads
    WHERE channel_heads.channel_id = p_channel_id
      AND channel_heads.channel_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Channel % does not exist or is already archived',
            p_channel_id
            USING ERRCODE = '55000';
    END IF;

    PERFORM 1
    FROM public.workspace_heads
    WHERE workspace_id = v_workspace_id
      AND workspace_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Workspace % is archived',
            v_workspace_id
            USING ERRCODE = '55000';
    END IF;

    IF NOT private.is_active_workspace_owner(
        v_workspace_id,
        v_actor_user_id
    ) THEN
        RAISE EXCEPTION
            'Only active workspace owners may archive channels'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.channel_heads
    SET
        channel_status = 'archived',
        updated_at = statement_timestamp()
    WHERE channel_id = p_channel_id;
END;
$$;


COMMENT ON FUNCTION public.archive_channel(UUID) IS
    'Archives an active channel. Active workspace ownership is required.';


-- ============================================================================
-- Function privileges
-- ============================================================================
--
-- PUBLIC includes every database role. Revoke its implicit function execution
-- before granting the intended application role.
-- ============================================================================

REVOKE ALL
ON FUNCTION public.create_channel(
    UUID,
    TEXT,
    TEXT,
    TEXT
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.update_channel(
    UUID,
    TEXT,
    TEXT
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.archive_channel(UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.create_channel(
    UUID,
    TEXT,
    TEXT,
    TEXT
)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.update_channel(
    UUID,
    TEXT,
    TEXT
)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.archive_channel(UUID)
TO authenticated;


-- ============================================================================
-- Direct-write protection
-- ============================================================================

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.channels
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.channel_versions
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.channel_heads
FROM anon, authenticated;