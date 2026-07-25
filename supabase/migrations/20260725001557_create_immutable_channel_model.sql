-- ============================================================================
-- Immutable channel aggregate
-- ============================================================================
--
-- Aggregate structure:
--
--   channels
--       Stable channel identity and workspace ownership.
--
--   channel_versions
--       Append-only descriptive channel history.
--
--   channel_heads
--       Mutable pointer to the current version and lifecycle status.
--
-- Initial scope:
--
--   - workspace channels only;
--   - public channels only;
--   - no private channel memberships;
--   - no message tables yet;
--   - mutations will later be exposed through SECURITY DEFINER commands.
-- ============================================================================


-- ============================================================================
-- Supporting mutation guard
-- ============================================================================
--
-- Stable identities and version rows are append-only. This function prevents
-- UPDATE and DELETE operations even when executed by privileged command code.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.reject_immutable_row_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION
        'Rows in %.% are immutable and cannot be %',
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        TG_OP
        USING ERRCODE = '55000';
END;
$$;


REVOKE ALL
ON FUNCTION private.reject_immutable_row_mutation()
FROM PUBLIC;


-- ============================================================================
-- Stable channel identity
-- ============================================================================
--
-- workspace_id never changes. Moving a channel between workspaces would create
-- a new channel identity rather than mutate ownership.
--
-- slug is also part of the stable identity in the first implementation. This
-- gives the database a reliable workspace-scoped uniqueness constraint without
-- duplicating current version data into channel_heads.
--
-- The display name and description remain versioned and may be changed later.
-- ============================================================================

CREATE TABLE public.channels (
    channel_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL,

    slug TEXT NOT NULL,

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT statement_timestamp(),

    CONSTRAINT channels_workspace_id_fkey
        FOREIGN KEY (workspace_id)
        REFERENCES public.workspaces (workspace_id),

    CONSTRAINT channels_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.profiles (user_id),

    CONSTRAINT channels_slug_not_blank
        CHECK (btrim(slug) <> ''),

    CONSTRAINT channels_slug_format
        CHECK (
            slug = lower(slug)
            AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        ),

    CONSTRAINT channels_workspace_slug_key
        UNIQUE (workspace_id, slug),

    CONSTRAINT channels_channel_workspace_key
        UNIQUE (channel_id, workspace_id)
);


COMMENT ON TABLE public.channels IS
    'Stable channel identities. Rows are immutable after creation.';

COMMENT ON COLUMN public.channels.workspace_id IS
    'Workspace that permanently owns the channel identity.';

COMMENT ON COLUMN public.channels.slug IS
    'Immutable workspace-scoped channel identifier used in URLs and lookups.';


-- ============================================================================
-- Immutable channel versions
-- ============================================================================

CREATE TABLE public.channel_versions (
    channel_version_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    channel_id UUID NOT NULL,

    version_number INTEGER NOT NULL,

    name TEXT NOT NULL,

    description TEXT,

    created_by UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT statement_timestamp(),

    CONSTRAINT channel_versions_channel_id_fkey
        FOREIGN KEY (channel_id)
        REFERENCES public.channels (channel_id),

    CONSTRAINT channel_versions_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.profiles (user_id),

    CONSTRAINT channel_versions_version_number_positive
        CHECK (version_number > 0),

    CONSTRAINT channel_versions_name_not_blank
        CHECK (btrim(name) <> ''),

    CONSTRAINT channel_versions_description_not_blank
        CHECK (
            description IS NULL
            OR btrim(description) <> ''
        ),

    CONSTRAINT channel_versions_channel_version_number_key
        UNIQUE (channel_id, version_number),

    CONSTRAINT channel_versions_channel_version_id_key
        UNIQUE (channel_id, channel_version_id)
);


COMMENT ON TABLE public.channel_versions IS
    'Append-only descriptive history for channels.';

COMMENT ON COLUMN public.channel_versions.version_number IS
    'Monotonically increasing version number within one channel identity.';


-- ============================================================================
-- Mutable channel head
-- ============================================================================
--
-- channel_heads is the only mutable table in this aggregate.
--
-- It records:
--
--   - the current immutable version;
--   - the current lifecycle state;
--   - the time at which the projection last changed.
-- ============================================================================

CREATE TABLE public.channel_heads (
    channel_id UUID PRIMARY KEY,

    workspace_id UUID NOT NULL,

    latest_channel_version_id UUID NOT NULL,

    latest_version_number INTEGER NOT NULL,

    channel_status TEXT NOT NULL
        DEFAULT 'active',

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT statement_timestamp(),

    CONSTRAINT channel_heads_channel_workspace_fkey
        FOREIGN KEY (channel_id, workspace_id)
        REFERENCES public.channels (
            channel_id,
            workspace_id
        ),

    CONSTRAINT channel_heads_current_version_fkey
        FOREIGN KEY (
            channel_id,
            latest_channel_version_id
        )
        REFERENCES public.channel_versions (
            channel_id,
            channel_version_id
        ),

    CONSTRAINT channel_heads_version_number_positive
        CHECK (latest_version_number > 0),

    CONSTRAINT channel_heads_status_check
        CHECK (
            channel_status IN (
                'active',
                'archived'
            )
        )
);


COMMENT ON TABLE public.channel_heads IS
    'Mutable current-state projection for immutable channel history.';

COMMENT ON COLUMN public.channel_heads.channel_status IS
    'Current channel lifecycle status: active or archived.';


-- ============================================================================
-- Cross-table head consistency
-- ============================================================================
--
-- The foreign key above proves that the selected version belongs to the same
-- channel, but it cannot prove that latest_version_number matches the selected
-- version row. This trigger enforces that remaining invariant.
-- ============================================================================

CREATE OR REPLACE FUNCTION private.validate_channel_head()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_version_number INTEGER;
BEGIN
    SELECT channel_versions.version_number
    INTO v_version_number
    FROM public.channel_versions
    WHERE channel_versions.channel_id = NEW.channel_id
      AND channel_versions.channel_version_id =
            NEW.latest_channel_version_id;

    IF v_version_number IS NULL THEN
        RAISE EXCEPTION
            'Channel version % does not belong to channel %',
            NEW.latest_channel_version_id,
            NEW.channel_id
            USING ERRCODE = '23503';
    END IF;

    IF v_version_number <> NEW.latest_version_number THEN
        RAISE EXCEPTION
            'Channel head version number % does not match selected channel version number %',
            NEW.latest_version_number,
            v_version_number
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;


REVOKE ALL
ON FUNCTION private.validate_channel_head()
FROM PUBLIC;


CREATE TRIGGER validate_channel_head_before_write
BEFORE INSERT OR UPDATE
ON public.channel_heads
FOR EACH ROW
EXECUTE FUNCTION private.validate_channel_head();


-- ============================================================================
-- Immutability triggers
-- ============================================================================

CREATE TRIGGER channels_reject_update
BEFORE UPDATE
ON public.channels
FOR EACH ROW
EXECUTE FUNCTION private.reject_immutable_row_mutation();


CREATE TRIGGER channels_reject_delete
BEFORE DELETE
ON public.channels
FOR EACH ROW
EXECUTE FUNCTION private.reject_immutable_row_mutation();


CREATE TRIGGER channel_versions_reject_update
BEFORE UPDATE
ON public.channel_versions
FOR EACH ROW
EXECUTE FUNCTION private.reject_immutable_row_mutation();


CREATE TRIGGER channel_versions_reject_delete
BEFORE DELETE
ON public.channel_versions
FOR EACH ROW
EXECUTE FUNCTION private.reject_immutable_row_mutation();


-- ============================================================================
-- Current channel projection
-- ============================================================================

CREATE VIEW public.current_channels
WITH (security_invoker = true)
AS
SELECT
    channels.channel_id,
    channels.workspace_id,
    channels.slug,
    channels.created_by,
    channels.created_at,

    channel_versions.channel_version_id,
    channel_versions.version_number,
    channel_versions.name,
    channel_versions.description,
    channel_versions.created_by AS version_created_by,
    channel_versions.created_at AS version_created_at,

    channel_heads.channel_status,
    channel_heads.updated_at
FROM public.channels
INNER JOIN public.channel_heads
    ON channel_heads.channel_id =
        channels.channel_id
INNER JOIN public.channel_versions
    ON channel_versions.channel_id =
        channel_heads.channel_id
   AND channel_versions.channel_version_id =
        channel_heads.latest_channel_version_id;


COMMENT ON VIEW public.current_channels IS
    'Current channel projection assembled from stable identity, immutable version history, and mutable head state.';


-- ============================================================================
-- Query indexes
-- ============================================================================

CREATE INDEX channels_workspace_id_idx
ON public.channels (workspace_id);


CREATE INDEX channel_versions_channel_created_at_idx
ON public.channel_versions (
    channel_id,
    created_at DESC
);


CREATE INDEX channel_heads_workspace_status_idx
ON public.channel_heads (
    workspace_id,
    channel_status
);


CREATE INDEX channel_heads_latest_version_idx
ON public.channel_heads (
    latest_channel_version_id
);


-- ============================================================================
-- Application-role privileges
-- ============================================================================
--
-- No application-role privileges are granted yet.
--
-- Read access will be introduced with channel RLS policies. Mutation access
-- will be provided only through SECURITY DEFINER command functions.
-- ============================================================================

REVOKE ALL
ON TABLE public.channels
FROM anon, authenticated;


REVOKE ALL
ON TABLE public.channel_versions
FROM anon, authenticated;


REVOKE ALL
ON TABLE public.channel_heads
FROM anon, authenticated;


REVOKE ALL
ON public.current_channels
FROM anon, authenticated;