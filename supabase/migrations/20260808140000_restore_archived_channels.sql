-- ============================================================================
-- Restore archived channels
-- ============================================================================
--
-- Channel lifecycle is held by the mutable channel head, while descriptive
-- history remains immutable. Restoration therefore changes only the lifecycle
-- state and returns the now-active current projection. The existing channel-
-- head trigger broadcasts the navigation invalidation after commit.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.restore_channel(
    p_channel_id UUID
)
RETURNS public.current_channels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_user_id UUID;
    v_workspace_id UUID;
    v_restored_channel public.current_channels;
BEGIN
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to restore a channel'
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
      AND channel_heads.channel_status = 'archived'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Channel % does not exist or is not archived',
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
            'Only active workspace owners may restore channels'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.channel_heads
    SET
        channel_status = 'active',
        updated_at = statement_timestamp()
    WHERE channel_id = p_channel_id;

    SELECT current_channels.*
    INTO v_restored_channel
    FROM public.current_channels
    WHERE current_channels.channel_id = p_channel_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Restored channel % could not be projected',
            p_channel_id
            USING ERRCODE = 'P0002';
    END IF;

    RETURN v_restored_channel;
END;
$$;


COMMENT ON FUNCTION public.restore_channel(UUID) IS
    'Restores an archived channel and returns its active current projection. Active workspace ownership is required.';


REVOKE ALL
ON FUNCTION public.restore_channel(UUID)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.restore_channel(UUID)
TO authenticated;
