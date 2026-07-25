-- ============================================================================
-- Message command layer
-- ============================================================================
--
-- Commands:
--
--   create_message(...)
--       Creates a stable message identity, immutable version 1, and active head.
--
--   edit_message(...)
--       Appends a new immutable text version and advances the message head.
--
--   delete_message(...)
--       Soft-deletes the message by updating only message_heads.
--
-- Authorization:
--
--   - active workspace members may create messages in active channels;
--   - only the original author may edit an active message;
--   - the original author or an active workspace owner may delete a message;
--   - archived workspaces reject all message mutations;
--   - archived channels reject all message mutations;
--   - deleted messages cannot be edited or deleted again.
--
-- Application roles receive EXECUTE only. Direct writes to the aggregate tables
-- remain prohibited.
-- ============================================================================


-- ============================================================================
-- Create message
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_message(
    p_channel_id UUID,
    p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_user_id UUID;
    v_workspace_id UUID;
    v_message_id UUID;
    v_message_version_id UUID;
    v_normalized_content TEXT;
BEGIN
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to create a message'
            USING ERRCODE = '42501';
    END IF;

    IF p_channel_id IS NULL THEN
        RAISE EXCEPTION
            'Channel ID is required'
            USING ERRCODE = '22004';
    END IF;

    v_normalized_content := btrim(p_content);

    IF v_normalized_content IS NULL
       OR v_normalized_content = '' THEN
        RAISE EXCEPTION
            'Message content must not be blank'
            USING ERRCODE = '22023';
    END IF;

    -- Resolve the stable workspace association before taking locks.
    SELECT channels.workspace_id
    INTO v_workspace_id
    FROM public.channels
    WHERE channels.channel_id = p_channel_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Channel % does not exist',
            p_channel_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Use a consistent parent-to-child lock order:
    --
    --   workspace -> channel
    --
    -- This prevents either aggregate from being archived while the message is
    -- being created.
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

    PERFORM 1
    FROM public.channel_heads
    WHERE channel_id = p_channel_id
      AND workspace_id = v_workspace_id
      AND channel_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Channel % is archived',
            p_channel_id
            USING ERRCODE = '55000';
    END IF;

    IF NOT private.is_active_workspace_member(
        v_workspace_id,
        v_actor_user_id
    ) THEN
        RAISE EXCEPTION
            'Only active workspace members may create messages'
            USING ERRCODE = '42501';
    END IF;

    v_message_id := gen_random_uuid();
    v_message_version_id := gen_random_uuid();

    INSERT INTO public.messages (
        message_id,
        workspace_id,
        channel_id,
        author_user_id
    )
    VALUES (
        v_message_id,
        v_workspace_id,
        p_channel_id,
        v_actor_user_id
    );

    INSERT INTO public.message_versions (
        message_version_id,
        message_id,
        version_number,
        content,
        created_by
    )
    VALUES (
        v_message_version_id,
        v_message_id,
        1,
        v_normalized_content,
        v_actor_user_id
    );

    INSERT INTO public.message_heads (
        message_id,
        workspace_id,
        channel_id,
        latest_message_version_id,
        latest_version_number,
        message_status
    )
    VALUES (
        v_message_id,
        v_workspace_id,
        p_channel_id,
        v_message_version_id,
        1,
        'active'
    );

    RETURN v_message_id;
END;
$$;


COMMENT ON FUNCTION public.create_message(
    UUID,
    TEXT
) IS
    'Creates a text message in an active channel. Active workspace membership is required.';


-- ============================================================================
-- Edit message
-- ============================================================================
--
-- Editing never mutates an existing message version.
--
-- A successful edit:
--
--   1. resolves the stable message associations;
--   2. locks workspace, channel, and message head;
--   3. verifies that the caller is the original author;
--   4. appends the next immutable version;
--   5. advances the mutable message head.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.edit_message(
    p_message_id UUID,
    p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_user_id UUID;
    v_workspace_id UUID;
    v_channel_id UUID;
    v_author_user_id UUID;
    v_current_content TEXT;
    v_current_version_number INTEGER;
    v_next_version_number INTEGER;
    v_message_version_id UUID;
    v_normalized_content TEXT;
BEGIN
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to edit a message'
            USING ERRCODE = '42501';
    END IF;

    IF p_message_id IS NULL THEN
        RAISE EXCEPTION
            'Message ID is required'
            USING ERRCODE = '22004';
    END IF;

    v_normalized_content := btrim(p_content);

    IF v_normalized_content IS NULL
       OR v_normalized_content = '' THEN
        RAISE EXCEPTION
            'Message content must not be blank'
            USING ERRCODE = '22023';
    END IF;

    SELECT
        messages.workspace_id,
        messages.channel_id,
        messages.author_user_id
    INTO
        v_workspace_id,
        v_channel_id,
        v_author_user_id
    FROM public.messages
    WHERE messages.message_id = p_message_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Message % does not exist',
            p_message_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Parent-to-child lock order:
    --
    --   workspace -> channel -> message
    --
    -- The state predicates are evaluated while holding the corresponding row
    -- locks, preventing concurrent archival or deletion from racing this edit.
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

    PERFORM 1
    FROM public.channel_heads
    WHERE channel_id = v_channel_id
      AND workspace_id = v_workspace_id
      AND channel_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Channel % is archived',
            v_channel_id
            USING ERRCODE = '55000';
    END IF;

    SELECT
        message_heads.latest_version_number,
        message_versions.content
    INTO
        v_current_version_number,
        v_current_content
    FROM public.message_heads
    INNER JOIN public.message_versions
        ON message_versions.message_id =
            message_heads.message_id
       AND message_versions.message_version_id =
            message_heads.latest_message_version_id
    WHERE message_heads.message_id = p_message_id
      AND message_heads.workspace_id = v_workspace_id
      AND message_heads.channel_id = v_channel_id
      AND message_heads.message_status = 'active'
    FOR UPDATE OF message_heads;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Message % is deleted',
            p_message_id
            USING ERRCODE = '55000';
    END IF;

    IF v_author_user_id <> v_actor_user_id THEN
        RAISE EXCEPTION
            'Only the original message author may edit this message'
            USING ERRCODE = '42501';
    END IF;

    IF v_current_content = v_normalized_content THEN
        RAISE EXCEPTION
            'Edited message content must differ from the current content'
            USING ERRCODE = '22023';
    END IF;

    v_next_version_number := v_current_version_number + 1;
    v_message_version_id := gen_random_uuid();

    INSERT INTO public.message_versions (
        message_version_id,
        message_id,
        version_number,
        content,
        created_by
    )
    VALUES (
        v_message_version_id,
        p_message_id,
        v_next_version_number,
        v_normalized_content,
        v_actor_user_id
    );

    UPDATE public.message_heads
    SET
        latest_message_version_id = v_message_version_id,
        latest_version_number = v_next_version_number,
        updated_at = statement_timestamp()
    WHERE message_id = p_message_id;

    RETURN v_message_version_id;
END;
$$;


COMMENT ON FUNCTION public.edit_message(
    UUID,
    TEXT
) IS
    'Appends a new immutable text version. Only the original author may edit an active message.';


-- ============================================================================
-- Delete message
-- ============================================================================
--
-- Deletion is a soft lifecycle transition. Stable identity and immutable text
-- history remain retained.
--
-- Allowed actors:
--
--   - original message author;
--   - active workspace owner.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_message(
    p_message_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_user_id UUID;
    v_workspace_id UUID;
    v_channel_id UUID;
    v_author_user_id UUID;
    v_actor_is_owner BOOLEAN;
BEGIN
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to delete a message'
            USING ERRCODE = '42501';
    END IF;

    IF p_message_id IS NULL THEN
        RAISE EXCEPTION
            'Message ID is required'
            USING ERRCODE = '22004';
    END IF;

    SELECT
        messages.workspace_id,
        messages.channel_id,
        messages.author_user_id
    INTO
        v_workspace_id,
        v_channel_id,
        v_author_user_id
    FROM public.messages
    WHERE messages.message_id = p_message_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Message % does not exist',
            p_message_id
            USING ERRCODE = 'P0002';
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

    PERFORM 1
    FROM public.channel_heads
    WHERE channel_id = v_channel_id
      AND workspace_id = v_workspace_id
      AND channel_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Channel % is archived',
            v_channel_id
            USING ERRCODE = '55000';
    END IF;

    PERFORM 1
    FROM public.message_heads
    WHERE message_id = p_message_id
      AND workspace_id = v_workspace_id
      AND channel_id = v_channel_id
      AND message_status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Message % is already deleted',
            p_message_id
            USING ERRCODE = '55000';
    END IF;

    v_actor_is_owner := private.is_active_workspace_owner(
        v_workspace_id,
        v_actor_user_id
    );

    IF v_actor_user_id <> v_author_user_id
       AND NOT v_actor_is_owner THEN
        RAISE EXCEPTION
            'Only the original author or an active workspace owner may delete this message'
            USING ERRCODE = '42501';
    END IF;

    -- Authors must still be active members. Owners satisfy the same condition
    -- through their active owner membership.
    IF NOT private.is_active_workspace_member(
        v_workspace_id,
        v_actor_user_id
    ) THEN
        RAISE EXCEPTION
            'Only active workspace members may delete messages'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.message_heads
    SET
        message_status = 'deleted',
        deleted_by = v_actor_user_id,
        deleted_at = statement_timestamp(),
        updated_at = statement_timestamp()
    WHERE message_id = p_message_id;
END;
$$;


COMMENT ON FUNCTION public.delete_message(UUID) IS
    'Soft-deletes an active message. The original author or an active workspace owner may perform the deletion.';


-- ============================================================================
-- Function privileges
-- ============================================================================

REVOKE ALL
ON FUNCTION public.create_message(
    UUID,
    TEXT
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.edit_message(
    UUID,
    TEXT
)
FROM PUBLIC;


REVOKE ALL
ON FUNCTION public.delete_message(UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.create_message(
    UUID,
    TEXT
)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.edit_message(
    UUID,
    TEXT
)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.delete_message(UUID)
TO authenticated;


-- ============================================================================
-- Direct-write protection
-- ============================================================================

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.messages
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.message_versions
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.message_heads
FROM anon, authenticated;