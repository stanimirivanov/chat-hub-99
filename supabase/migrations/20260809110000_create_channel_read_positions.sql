-- ============================================================================
-- Per-member channel read positions and initial unread counts
-- ============================================================================
--
-- A missing row means that the member has not read any message in the channel.
-- The stored tuple is the creation position of the newest message observed by
-- that member. Commands only advance this tuple, so concurrent or stale calls
-- cannot move a read position backwards.
--
-- This migration deliberately adds snapshot queries only. Realtime unread
-- invalidation is owned by the following vertical slice.
-- ============================================================================

CREATE TABLE public.channel_read_positions (
    workspace_id UUID NOT NULL,
    channel_id UUID NOT NULL,
    user_id UUID NOT NULL,
    last_read_message_id UUID NOT NULL,
    last_read_message_created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT statement_timestamp(),

    CONSTRAINT channel_read_positions_pkey
        PRIMARY KEY (channel_id, user_id),

    CONSTRAINT channel_read_positions_membership_fkey
        FOREIGN KEY (workspace_id, user_id)
        REFERENCES public.workspace_memberships (workspace_id, user_id)
        ON DELETE RESTRICT,

    CONSTRAINT channel_read_positions_channel_fkey
        FOREIGN KEY (channel_id, workspace_id)
        REFERENCES public.channels (channel_id, workspace_id)
        ON DELETE RESTRICT,

    CONSTRAINT channel_read_positions_message_channel_fkey
        FOREIGN KEY (last_read_message_id, channel_id)
        REFERENCES public.messages (message_id, channel_id)
        ON DELETE RESTRICT,

    CONSTRAINT channel_read_positions_message_workspace_fkey
        FOREIGN KEY (last_read_message_id, workspace_id)
        REFERENCES public.messages (message_id, workspace_id)
        ON DELETE RESTRICT
);


COMMENT ON TABLE public.channel_read_positions IS
    'Newest message creation position observed by one workspace member in one channel.';

COMMENT ON COLUMN public.channel_read_positions.last_read_message_created_at IS
    'Denormalized immutable message creation time used with message ID as the monotonic ordering tuple.';


CREATE INDEX channel_read_positions_workspace_user_idx
ON public.channel_read_positions (workspace_id, user_id);


ALTER TABLE public.channel_read_positions
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON TABLE public.channel_read_positions
FROM anon, authenticated;


-- ============================================================================
-- Mark the current channel snapshot as read
-- ============================================================================

CREATE FUNCTION public.mark_channel_read(
    p_channel_id UUID,
    p_message_id UUID
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
    v_message_created_at TIMESTAMPTZ;
BEGIN
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to mark a channel as read'
            USING ERRCODE = '42501';
    END IF;

    IF p_channel_id IS NULL
       OR p_message_id IS NULL THEN
        RAISE EXCEPTION
            'Channel ID and message ID are required'
            USING ERRCODE = '22004';
    END IF;

    SELECT channels.workspace_id
    INTO v_workspace_id
    FROM public.channels
    INNER JOIN public.channel_heads
        ON channel_heads.channel_id = channels.channel_id
       AND channel_heads.workspace_id = channels.workspace_id
       AND channel_heads.channel_status = 'active'
    INNER JOIN public.workspace_heads
        ON workspace_heads.workspace_id = channels.workspace_id
       AND workspace_heads.workspace_status = 'active'
    WHERE channels.channel_id = p_channel_id;

    IF NOT FOUND
       OR NOT private.is_active_workspace_member(
           v_workspace_id,
           v_actor_user_id
       ) THEN
        RAISE EXCEPTION
            'Only active workspace members may mark an active channel as read'
            USING ERRCODE = '42501';
    END IF;

    SELECT messages.message_id, messages.created_at
    INTO v_message_id, v_message_created_at
    FROM public.messages
    WHERE messages.channel_id = p_channel_id
      AND messages.message_id = p_message_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Read target does not belong to the selected channel'
            USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.channel_read_positions (
        workspace_id,
        channel_id,
        user_id,
        last_read_message_id,
        last_read_message_created_at
    )
    VALUES (
        v_workspace_id,
        p_channel_id,
        v_actor_user_id,
        v_message_id,
        v_message_created_at
    )
    ON CONFLICT (channel_id, user_id)
    DO UPDATE
    SET
        last_read_message_id = EXCLUDED.last_read_message_id,
        last_read_message_created_at =
            EXCLUDED.last_read_message_created_at,
        updated_at = statement_timestamp()
    WHERE (
        EXCLUDED.last_read_message_created_at,
        EXCLUDED.last_read_message_id
    ) > (
        channel_read_positions.last_read_message_created_at,
        channel_read_positions.last_read_message_id
    );

    RETURN v_message_id;
END;
$$;


COMMENT ON FUNCTION public.mark_channel_read(UUID, UUID) IS
    'Advances the authenticated member read position through one exact message loaded from the selected active channel.';


-- ============================================================================
-- Workspace channel unread-count snapshot
-- ============================================================================

CREATE FUNCTION public.list_workspace_channel_unread_counts(
    p_workspace_id UUID
)
RETURNS TABLE (
    channel_id UUID,
    unread_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_user_id UUID;
BEGIN
    v_actor_user_id := auth.uid();

    IF v_actor_user_id IS NULL
       OR p_workspace_id IS NULL
       OR NOT private.is_active_workspace_member(
           p_workspace_id,
           v_actor_user_id
       ) THEN
        RAISE EXCEPTION
            'Only active workspace members may list channel unread counts'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        channels.channel_id,
        count(message_heads.message_id)::BIGINT AS unread_count
    FROM public.channels
    INNER JOIN public.channel_heads
        ON channel_heads.channel_id = channels.channel_id
       AND channel_heads.workspace_id = channels.workspace_id
       AND channel_heads.channel_status = 'active'
    INNER JOIN public.workspace_heads
        ON workspace_heads.workspace_id = channels.workspace_id
       AND workspace_heads.workspace_status = 'active'
    LEFT JOIN public.channel_read_positions
        ON channel_read_positions.channel_id = channels.channel_id
       AND channel_read_positions.workspace_id = channels.workspace_id
       AND channel_read_positions.user_id = v_actor_user_id
    LEFT JOIN public.messages
        ON messages.channel_id = channels.channel_id
       AND (
           channel_read_positions.last_read_message_id IS NULL
           OR (
               messages.created_at,
               messages.message_id
           ) > (
               channel_read_positions.last_read_message_created_at,
               channel_read_positions.last_read_message_id
           )
       )
    LEFT JOIN public.message_heads
        ON message_heads.message_id = messages.message_id
       AND message_heads.message_status = 'active'
    WHERE channels.workspace_id = p_workspace_id
    GROUP BY channels.channel_id;
END;
$$;


COMMENT ON FUNCTION public.list_workspace_channel_unread_counts(UUID) IS
    'Lists an authoritative unread active-message count for every active channel visible to the authenticated workspace member.';


REVOKE ALL
ON FUNCTION public.mark_channel_read(UUID, UUID)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.list_workspace_channel_unread_counts(UUID)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.mark_channel_read(UUID, UUID)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.list_workspace_channel_unread_counts(UUID)
TO authenticated;
