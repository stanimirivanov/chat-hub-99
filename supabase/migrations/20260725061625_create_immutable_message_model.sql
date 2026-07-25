-- ============================================================================
-- Immutable message aggregate
-- ============================================================================
--
-- Aggregate structure:
--
--   messages
--       Stable message identity, author, channel, and workspace association.
--
--   message_versions
--       Append-only text content history.
--
--   message_heads
--       Mutable pointer to the current version and lifecycle state.
--
-- Initial scope:
--
--   - text messages only;
--   - public workspace channels only;
--   - no threads;
--   - no attachments;
--   - no reactions;
--   - message deletion is represented by message_heads.message_status;
--   - immutable message versions remain retained after deletion.
-- ============================================================================


-- ============================================================================
-- Stable message identity
-- ============================================================================
--
-- The following properties never change:
--
--   - workspace;
--   - channel;
--   - original author;
--   - creation time.
--
-- Editing creates a new row in message_versions.
-- Deleting changes only message_heads.
-- ============================================================================

CREATE TABLE public.messages (
    message_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL,

    channel_id UUID NOT NULL,

    author_user_id UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT statement_timestamp(),

    CONSTRAINT messages_channel_workspace_fkey
        FOREIGN KEY (
            channel_id,
            workspace_id
        )
        REFERENCES public.channels (
            channel_id,
            workspace_id
        ),

    CONSTRAINT messages_author_user_id_fkey
        FOREIGN KEY (author_user_id)
        REFERENCES public.profiles (user_id),

    CONSTRAINT messages_message_channel_key
        UNIQUE (
            message_id,
            channel_id
        ),

    CONSTRAINT messages_message_workspace_key
        UNIQUE (
            message_id,
            workspace_id
        )
);


COMMENT ON TABLE public.messages IS
    'Stable message identities. Rows are immutable after creation.';

COMMENT ON COLUMN public.messages.author_user_id IS
    'User who originally created the message. This value never changes.';

COMMENT ON COLUMN public.messages.channel_id IS
    'Channel that permanently owns the message. Messages cannot be moved between channels.';


-- ============================================================================
-- Immutable message versions
-- ============================================================================
--
-- Every message begins with version 1.
--
-- Editing appends version 2, version 3, and so on. Existing versions are never
-- updated or deleted.
--
-- created_by records the actor responsible for the version. In the first
-- command implementation this will normally be the original message author.
-- Keeping it on each version permits future owner/moderator edits without
-- changing the schema.
-- ============================================================================

CREATE TABLE public.message_versions (
    message_version_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL,

    version_number INTEGER NOT NULL,

    content TEXT NOT NULL,

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT statement_timestamp(),

    CONSTRAINT message_versions_message_id_fkey
        FOREIGN KEY (message_id)
        REFERENCES public.messages (message_id),

    CONSTRAINT message_versions_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.profiles (user_id),

    CONSTRAINT message_versions_version_number_positive
        CHECK (version_number > 0),

    CONSTRAINT message_versions_content_not_blank
        CHECK (btrim(content) <> ''),

    CONSTRAINT message_versions_message_version_number_key
        UNIQUE (
            message_id,
            version_number
        ),

    CONSTRAINT message_versions_message_version_id_key
        UNIQUE (
            message_id,
            message_version_id
        )
);


COMMENT ON TABLE public.message_versions IS
    'Append-only text revision history for messages.';

COMMENT ON COLUMN public.message_versions.version_number IS
    'Monotonically increasing revision number within one message identity.';

COMMENT ON COLUMN public.message_versions.created_by IS
    'User responsible for creating this immutable message version.';


-- ============================================================================
-- Mutable message head
-- ============================================================================
--
-- message_heads is the only mutable table in the message aggregate.
--
-- It records:
--
--   - the current immutable version;
--   - whether the message is active or deleted;
--   - deletion metadata;
--   - the last projection update time.
--
-- Deleted messages retain their identity and complete immutable version history.
-- ============================================================================

CREATE TABLE public.message_heads (
    message_id UUID PRIMARY KEY,

    workspace_id UUID NOT NULL,

    channel_id UUID NOT NULL,

    latest_message_version_id UUID NOT NULL,

    latest_version_number INTEGER NOT NULL,

    message_status TEXT NOT NULL
        DEFAULT 'active',

    deleted_by UUID,

    deleted_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT statement_timestamp(),

    CONSTRAINT message_heads_message_channel_fkey
        FOREIGN KEY (
            message_id,
            channel_id
        )
        REFERENCES public.messages (
            message_id,
            channel_id
        ),

    CONSTRAINT message_heads_message_workspace_fkey
        FOREIGN KEY (
            message_id,
            workspace_id
        )
        REFERENCES public.messages (
            message_id,
            workspace_id
        ),

    CONSTRAINT message_heads_current_version_fkey
        FOREIGN KEY (
            message_id,
            latest_message_version_id
        )
        REFERENCES public.message_versions (
            message_id,
            message_version_id
        ),

    CONSTRAINT message_heads_deleted_by_fkey
        FOREIGN KEY (deleted_by)
        REFERENCES public.profiles (user_id),

    CONSTRAINT message_heads_version_number_positive
        CHECK (latest_version_number > 0),

    CONSTRAINT message_heads_status_check
        CHECK (
            message_status IN (
                'active',
                'deleted'
            )
        ),

    CONSTRAINT message_heads_deletion_state_check
        CHECK (
            (
                message_status = 'active'
                AND deleted_by IS NULL
                AND deleted_at IS NULL
            )
            OR
            (
                message_status = 'deleted'
                AND deleted_by IS NOT NULL
                AND deleted_at IS NOT NULL
            )
        )
);


COMMENT ON TABLE public.message_heads IS
    'Mutable current-state projection for immutable message history.';

COMMENT ON COLUMN public.message_heads.message_status IS
    'Current message lifecycle state: active or deleted.';

COMMENT ON COLUMN public.message_heads.deleted_by IS
    'User who deleted the message. Null while the message remains active.';

COMMENT ON COLUMN public.message_heads.deleted_at IS
    'Deletion time. Null while the message remains active.';


-- ============================================================================
-- Cross-table message-head consistency
-- ============================================================================
--
-- Foreign keys prove that:
--
--   - the message belongs to the selected channel and workspace;
--   - the selected version belongs to the message.
--
-- They cannot prove that latest_version_number matches the selected immutable
-- version row. This trigger enforces that final invariant.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.validate_message_head()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_version_number INTEGER;
BEGIN
    SELECT message_versions.version_number
    INTO v_version_number
    FROM public.message_versions
    WHERE message_versions.message_id =
            NEW.message_id
      AND message_versions.message_version_id =
            NEW.latest_message_version_id;

    IF v_version_number IS NULL THEN
        RAISE EXCEPTION
            'Message version % does not belong to message %',
            NEW.latest_message_version_id,
            NEW.message_id
            USING ERRCODE = '23503';
    END IF;

    IF v_version_number <> NEW.latest_version_number THEN
        RAISE EXCEPTION
            'Message head version number % does not match selected message version number %',
            NEW.latest_version_number,
            v_version_number
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;


REVOKE ALL
ON FUNCTION private.validate_message_head()
FROM PUBLIC;


CREATE TRIGGER validate_message_head_before_write
BEFORE INSERT OR UPDATE
ON public.message_heads
FOR EACH ROW
EXECUTE FUNCTION private.validate_message_head();


-- ============================================================================
-- Immutability triggers
-- ============================================================================
--
-- private.reject_immutable_row_mutation() was introduced by the immutable
-- domain migrations and is reused here.
-- ============================================================================

CREATE TRIGGER messages_reject_update
BEFORE UPDATE
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION private.reject_immutable_row_mutation();


CREATE TRIGGER messages_reject_delete
BEFORE DELETE
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION private.reject_immutable_row_mutation();


CREATE TRIGGER message_versions_reject_update
BEFORE UPDATE
ON public.message_versions
FOR EACH ROW
EXECUTE FUNCTION private.reject_immutable_row_mutation();


CREATE TRIGGER message_versions_reject_delete
BEFORE DELETE
ON public.message_versions
FOR EACH ROW
EXECUTE FUNCTION private.reject_immutable_row_mutation();


-- ============================================================================
-- Current message projection
-- ============================================================================
--
-- This projection includes deleted messages. Consumers can distinguish them
-- through message_status.
--
-- RLS will later determine:
--
--   - who can see active messages;
--   - whether ordinary members see deleted-message content;
--   - whether owners retain audit access to immutable history.
-- ============================================================================

CREATE VIEW public.current_messages
WITH (security_invoker = true)
AS
SELECT
    messages.message_id,
    messages.workspace_id,
    messages.channel_id,
    messages.author_user_id,
    messages.created_at,

    message_versions.message_version_id,
    message_versions.version_number,
    message_versions.content,
    message_versions.created_by AS version_created_by,
    message_versions.created_at AS version_created_at,

    message_heads.message_status,
    message_heads.deleted_by,
    message_heads.deleted_at,
    message_heads.updated_at,

    message_versions.version_number > 1 AS is_edited
FROM public.messages
INNER JOIN public.message_heads
    ON message_heads.message_id =
        messages.message_id
INNER JOIN public.message_versions
    ON message_versions.message_id =
        message_heads.message_id
   AND message_versions.message_version_id =
        message_heads.latest_message_version_id;


COMMENT ON VIEW public.current_messages IS
    'Current message projection assembled from stable identity, immutable text revisions, and mutable lifecycle state.';


-- ============================================================================
-- Query indexes
-- ============================================================================

CREATE INDEX messages_channel_created_at_idx
ON public.messages (
    channel_id,
    created_at DESC,
    message_id DESC
);


CREATE INDEX messages_workspace_created_at_idx
ON public.messages (
    workspace_id,
    created_at DESC
);


CREATE INDEX messages_author_created_at_idx
ON public.messages (
    author_user_id,
    created_at DESC
);


CREATE INDEX message_versions_message_created_at_idx
ON public.message_versions (
    message_id,
    created_at DESC
);


CREATE INDEX message_heads_channel_status_idx
ON public.message_heads (
    channel_id,
    message_status
);


CREATE INDEX message_heads_workspace_status_idx
ON public.message_heads (
    workspace_id,
    message_status
);


CREATE INDEX message_heads_latest_version_idx
ON public.message_heads (
    latest_message_version_id
);


-- ============================================================================
-- Application-role privileges
-- ============================================================================
--
-- No application-role reads are granted yet.
--
-- Read access will be introduced by message RLS policies. Mutations will be
-- exposed only through SECURITY DEFINER command functions.
-- ============================================================================

REVOKE ALL
ON TABLE public.messages
FROM anon, authenticated;


REVOKE ALL
ON TABLE public.message_versions
FROM anon, authenticated;


REVOKE ALL
ON TABLE public.message_heads
FROM anon, authenticated;


REVOKE ALL
ON public.current_messages
FROM anon, authenticated;