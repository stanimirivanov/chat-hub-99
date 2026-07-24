-- ============================================================================
-- Foundational immutable domain model
-- ============================================================================
--
-- This migration introduces three related storage concepts:
--
--   1. Stable identity tables
--
--      These tables identify long-lived domain concepts such as a profile,
--      workspace, or workspace membership.
--
--      Their identifiers remain stable for the complete lifetime of the
--      corresponding domain object.
--
--   2. Immutable history tables
--
--      Versions and events are inserted but never updated or deleted.
--
--      A change does not overwrite an existing row. Instead, a new version or
--      event is appended, preserving the complete history of the domain object.
--
--   3. Current-head projection tables
--
--      These tables identify the current immutable version or event.
--
--      Head rows are mutable by design. They are not the authoritative history;
--      they are an optimized projection used for:
--
--        - current-state queries;
--        - uniqueness constraints;
--        - authorization and RLS;
--        - efficient application reads.
--
--      Updating a head does not rewrite history. It only changes which immutable
--      record is considered current.
--
-- Normal application operations should therefore follow this transaction:
--
--   1. Lock the current head.
--   2. Insert a new immutable version or event.
--   3. Update the corresponding head.
--   4. Commit both operations atomically.
--
-- Direct UPDATE or DELETE operations against immutable tables are rejected by
-- database triggers defined near the end of this migration.
-- ============================================================================


-- ============================================================================
-- Profiles
-- ============================================================================

-- A profile is the stable application-level identity corresponding to a
-- Supabase Auth user.
--
-- Mutable attributes such as username, display name, avatar, and status do not
-- belong in this table. They are stored in profile_versions.
CREATE TABLE public.profiles (
    user_id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT now()
);


-- Each row is a complete immutable snapshot of a profile at a particular point
-- in its history.
--
-- Updating a profile means inserting another row with:
--
--   - the same user_id;
--   - the next version_number;
--   - supersedes_profile_version_id pointing to the previous version.
--
-- Existing rows must never be modified.
CREATE TABLE public.profile_versions (
    profile_version_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE RESTRICT,

    version_number INTEGER NOT NULL,

    username TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,

    -- Status is included in the profile snapshot for the initial model.
    --
    -- A future moderation model may separate status changes into dedicated
    -- account-status events.
    status TEXT NOT NULL
        DEFAULT 'active',

    -- The previous immutable version.
    --
    -- NULL is valid only for the first version of a profile.
    supersedes_profile_version_id UUID,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT profile_versions_version_positive
        CHECK (version_number > 0),

    CONSTRAINT profile_versions_username_not_blank
        CHECK (
            username IS NULL
            OR length(trim(username)) > 0
        ),

    CONSTRAINT profile_versions_display_name_not_blank
        CHECK (length(trim(display_name)) > 0),

    CONSTRAINT profile_versions_status_valid
        CHECK (
            status IN (
                'active',
                'deactivated',
                'banned'
            )
        ),

    -- A profile cannot have two snapshots with the same version number.
    CONSTRAINT profile_versions_user_version_unique
        UNIQUE (
            user_id,
            version_number
        ),

    -- Required by the composite self-referencing foreign key below.
    --
    -- Including user_id ensures that a version can supersede only another
    -- version belonging to the same profile.
    CONSTRAINT profile_versions_id_user_unique
        UNIQUE (
            profile_version_id,
            user_id
        ),

    -- A historical version can be superseded only once.
    --
    -- This prevents the history from branching into multiple competing
    -- successors.
    CONSTRAINT profile_versions_supersedes_unique
        UNIQUE (supersedes_profile_version_id),

    CONSTRAINT profile_versions_not_self_superseding
        CHECK (
            supersedes_profile_version_id IS NULL
            OR supersedes_profile_version_id <> profile_version_id
        )
);


ALTER TABLE public.profile_versions
ADD CONSTRAINT profile_versions_supersedes_same_user
FOREIGN KEY (
    supersedes_profile_version_id,
    user_id
)
REFERENCES public.profile_versions (
    profile_version_id,
    user_id
)
ON DELETE RESTRICT;


-- profile_heads is the mutable current-state projection for profiles.
--
-- There is exactly one head per user. The head points to one immutable profile
-- version belonging to that same user.
--
-- current_username and profile_status intentionally duplicate values from the
-- immutable version. They allow current-state uniqueness and authorization
-- checks without scanning or joining the entire history.
CREATE TABLE public.profile_heads (
    user_id UUID PRIMARY KEY
        REFERENCES public.profiles(user_id)
        ON DELETE RESTRICT,

    profile_version_id UUID NOT NULL,

    current_username TEXT,
    profile_status TEXT NOT NULL,

    CONSTRAINT profile_heads_profile_version_unique
        UNIQUE (profile_version_id),

    CONSTRAINT profile_heads_current_username_not_blank
        CHECK (
            current_username IS NULL
            OR length(trim(current_username)) > 0
        ),

    CONSTRAINT profile_heads_profile_status_valid
        CHECK (
            profile_status IN (
                'active',
                'deactivated',
                'banned'
            )
        ),

    -- The composite foreign key guarantees that the selected version belongs
    -- to the same user as the head.
    CONSTRAINT profile_heads_version_belongs_to_user
        FOREIGN KEY (
            profile_version_id,
            user_id
        )
        REFERENCES public.profile_versions (
            profile_version_id,
            user_id
        )
        ON DELETE RESTRICT
);


-- Username uniqueness applies only to current profiles.
--
-- Historical versions may repeat the same username. This is required because a
-- new profile version will often retain the previous username.
--
-- lower(...) makes username uniqueness case-insensitive:
--
--   "Stanimir", "stanimir", and "STANIMIR"
--
-- are treated as the same current username.
CREATE UNIQUE INDEX profile_heads_current_username_unique
ON public.profile_heads (
    lower(current_username)
)
WHERE current_username IS NOT NULL;


CREATE INDEX profile_versions_user_history_idx
ON public.profile_versions (
    user_id,
    version_number DESC
);


-- ============================================================================
-- Workspaces
-- ============================================================================

-- A workspace row represents only the stable identity and immutable creation
-- facts of the workspace.
--
-- Name, slug, description, and lifecycle status belong to workspace_versions.
CREATE TABLE public.workspaces (
    workspace_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    created_by UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT now()
);


-- Each workspace version is a complete immutable snapshot.
--
-- Renaming, changing the description, changing the slug, or archiving a
-- workspace creates a new row rather than updating an existing row.
CREATE TABLE public.workspace_versions (
    workspace_version_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(workspace_id)
        ON DELETE RESTRICT,

    version_number INTEGER NOT NULL,

    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,

    status TEXT NOT NULL
        DEFAULT 'active',

    supersedes_workspace_version_id UUID,

    created_by UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT workspace_versions_version_positive
        CHECK (version_number > 0),

    CONSTRAINT workspace_versions_name_not_blank
        CHECK (length(trim(name)) > 0),

    CONSTRAINT workspace_versions_slug_not_blank
        CHECK (length(trim(slug)) > 0),

    CONSTRAINT workspace_versions_slug_format
        CHECK (
            slug = lower(slug)
            AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        ),

    CONSTRAINT workspace_versions_status_valid
        CHECK (
            status IN (
                'active',
                'archived'
            )
        ),

    CONSTRAINT workspace_versions_workspace_version_unique
        UNIQUE (
            workspace_id,
            version_number
        ),

    CONSTRAINT workspace_versions_id_workspace_unique
        UNIQUE (
            workspace_version_id,
            workspace_id
        ),

    CONSTRAINT workspace_versions_supersedes_unique
        UNIQUE (supersedes_workspace_version_id),

    CONSTRAINT workspace_versions_not_self_superseding
        CHECK (
            supersedes_workspace_version_id IS NULL
            OR supersedes_workspace_version_id <> workspace_version_id
        )
);


ALTER TABLE public.workspace_versions
ADD CONSTRAINT workspace_versions_supersedes_same_workspace
FOREIGN KEY (
    supersedes_workspace_version_id,
    workspace_id
)
REFERENCES public.workspace_versions (
    workspace_version_id,
    workspace_id
)
ON DELETE RESTRICT;


-- workspace_heads identifies the current immutable workspace version.
--
-- The duplicated current values support:
--
--   - efficient workspace listing;
--   - current slug uniqueness;
--   - authorization checks against archived workspaces;
--   - simpler future RLS policies.
CREATE TABLE public.workspace_heads (
    workspace_id UUID PRIMARY KEY
        REFERENCES public.workspaces(workspace_id)
        ON DELETE RESTRICT,

    workspace_version_id UUID NOT NULL,

    current_name TEXT NOT NULL,
    current_slug TEXT NOT NULL,
    workspace_status TEXT NOT NULL,

    CONSTRAINT workspace_heads_workspace_version_unique
        UNIQUE (workspace_version_id),

    CONSTRAINT workspace_heads_current_name_not_blank
        CHECK (length(trim(current_name)) > 0),

    CONSTRAINT workspace_heads_current_slug_not_blank
        CHECK (length(trim(current_slug)) > 0),

    CONSTRAINT workspace_heads_current_slug_format
        CHECK (
            current_slug = lower(current_slug)
            AND current_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        ),

    CONSTRAINT workspace_heads_workspace_status_valid
        CHECK (
            workspace_status IN (
                'active',
                'archived'
            )
        ),

    CONSTRAINT workspace_heads_version_belongs_to_workspace
        FOREIGN KEY (
            workspace_version_id,
            workspace_id
        )
        REFERENCES public.workspace_versions (
            workspace_version_id,
            workspace_id
        )
        ON DELETE RESTRICT
);


-- Workspace slug uniqueness applies only to current workspace versions.
--
-- Historical versions may retain or reuse the same slug.
CREATE UNIQUE INDEX workspace_heads_current_slug_unique
ON public.workspace_heads (
    lower(current_slug)
);


CREATE INDEX workspace_versions_workspace_history_idx
ON public.workspace_versions (
    workspace_id,
    version_number DESC
);


CREATE INDEX workspaces_created_by_idx
ON public.workspaces (
    created_by
);


-- ============================================================================
-- Workspace memberships
-- ============================================================================

-- A workspace membership has one stable identity for the complete relationship
-- between one user and one workspace.
--
-- If a user joins, leaves, and later rejoins, the same stable membership row is
-- retained. Those lifecycle changes are represented by immutable events.
CREATE TABLE public.workspace_memberships (
    workspace_membership_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(workspace_id)
        ON DELETE RESTRICT,

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    -- There can be only one stable membership relationship between a user and
    -- a workspace.
    CONSTRAINT workspace_memberships_workspace_user_unique
        UNIQUE (
            workspace_id,
            user_id
        ),

    -- Required by composite foreign keys in the event and head tables.
    CONSTRAINT workspace_memberships_identity_unique
        UNIQUE (
            workspace_membership_id,
            workspace_id,
            user_id
        )
);


-- Memberships are represented as immutable business events instead of mutable
-- snapshots.
--
-- This preserves the meaning of each lifecycle action:
--
--   joined
--   role_changed
--   suspended
--   reinstated
--   left
--   removed
--
-- Events are inserted and never modified or deleted.
CREATE TABLE public.workspace_membership_events (
    workspace_membership_event_id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    workspace_membership_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,

    sequence_number INTEGER NOT NULL,

    event_type TEXT NOT NULL,

    -- role represents the resulting role after this event where applicable.
    --
    -- Examples:
    --
    --   joined        -> owner or member
    --   role_changed  -> owner or member
    --   reinstated    -> owner or member
    --   left          -> may retain the previous role for audit purposes
    --   removed       -> may retain the previous role for audit purposes
    role TEXT,

    -- The actor who caused the event.
    --
    -- This can be the membership user themselves, a workspace owner, or a
    -- trusted administrative process.
    performed_by UUID
        REFERENCES public.profiles(user_id)
        ON DELETE RESTRICT,

    reason TEXT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT now(),

    CONSTRAINT workspace_membership_events_sequence_positive
        CHECK (sequence_number > 0),

    CONSTRAINT workspace_membership_events_type_valid
        CHECK (
            event_type IN (
                'joined',
                'role_changed',
                'suspended',
                'reinstated',
                'left',
                'removed'
            )
        ),

    CONSTRAINT workspace_membership_events_role_valid
        CHECK (
            role IS NULL
            OR role IN (
                'owner',
                'member'
            )
        ),

    CONSTRAINT workspace_membership_events_reason_not_blank
        CHECK (
            reason IS NULL
            OR length(trim(reason)) > 0
        ),

    CONSTRAINT workspace_membership_events_sequence_unique
        UNIQUE (
            workspace_membership_id,
            sequence_number
        ),

    CONSTRAINT workspace_membership_events_id_membership_unique
        UNIQUE (
            workspace_membership_event_id,
            workspace_membership_id
        ),

    -- The composite foreign key prevents an event from claiming a workspace or
    -- user different from the stable membership relationship.
    CONSTRAINT workspace_membership_events_membership_identity
        FOREIGN KEY (
            workspace_membership_id,
            workspace_id,
            user_id
        )
        REFERENCES public.workspace_memberships (
            workspace_membership_id,
            workspace_id,
            user_id
        )
        ON DELETE RESTRICT
);


-- workspace_membership_heads is the current-state projection used by normal
-- application queries and authorization policies.
--
-- The immutable event history remains authoritative. This table stores the
-- result of applying the latest event.
CREATE TABLE public.workspace_membership_heads (
    workspace_membership_id UUID PRIMARY KEY,

    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,

    latest_event_id UUID NOT NULL,

    membership_role TEXT NOT NULL,
    membership_status TEXT NOT NULL,

    CONSTRAINT workspace_membership_heads_workspace_user_unique
        UNIQUE (
            workspace_id,
            user_id
        ),

    CONSTRAINT workspace_membership_heads_latest_event_unique
        UNIQUE (latest_event_id),

    CONSTRAINT workspace_membership_heads_role_valid
        CHECK (
            membership_role IN (
                'owner',
                'member'
            )
        ),

    CONSTRAINT workspace_membership_heads_status_valid
        CHECK (
            membership_status IN (
                'active',
                'suspended',
                'left',
                'removed'
            )
        ),

    CONSTRAINT workspace_membership_heads_membership_identity
        FOREIGN KEY (
            workspace_membership_id,
            workspace_id,
            user_id
        )
        REFERENCES public.workspace_memberships (
            workspace_membership_id,
            workspace_id,
            user_id
        )
        ON DELETE RESTRICT,

    CONSTRAINT workspace_membership_heads_latest_event
        FOREIGN KEY (
            latest_event_id,
            workspace_membership_id
        )
        REFERENCES public.workspace_membership_events (
            workspace_membership_event_id,
            workspace_membership_id
        )
        ON DELETE RESTRICT
);


CREATE INDEX workspace_membership_heads_user_idx
ON public.workspace_membership_heads (
    user_id,
    membership_status
);


CREATE INDEX workspace_membership_heads_workspace_idx
ON public.workspace_membership_heads (
    workspace_id,
    membership_status,
    membership_role
);


CREATE INDEX workspace_membership_events_history_idx
ON public.workspace_membership_events (
    workspace_membership_id,
    sequence_number DESC
);


CREATE INDEX workspace_membership_events_performed_by_idx
ON public.workspace_membership_events (
    performed_by
)
WHERE performed_by IS NOT NULL;


-- ============================================================================
-- Database-level immutability enforcement
-- ============================================================================

-- This trigger function prevents UPDATE and DELETE operations against tables
-- whose rows represent immutable facts.
--
-- The application must append a new version or event instead of rewriting
-- history.
--
-- The migration itself can still remove these tables through DROP TABLE during
-- local database resets because DROP TABLE does not execute row-level DELETE
-- triggers.
CREATE OR REPLACE FUNCTION public.prevent_immutable_row_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Table %.% is immutable; append a new version or event instead of using %',
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        TG_OP
        USING ERRCODE = '55000';
END;
$$;


-- Stable identity rows are also immutable.
--
-- Their creation facts and identifiers must not be rewritten.
CREATE TRIGGER profiles_prevent_mutation
BEFORE UPDATE OR DELETE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_row_mutation();


CREATE TRIGGER workspaces_prevent_mutation
BEFORE UPDATE OR DELETE
ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_row_mutation();


CREATE TRIGGER workspace_memberships_prevent_mutation
BEFORE UPDATE OR DELETE
ON public.workspace_memberships
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_row_mutation();


-- Historical rows are strictly append-only.
CREATE TRIGGER profile_versions_prevent_mutation
BEFORE UPDATE OR DELETE
ON public.profile_versions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_row_mutation();


CREATE TRIGGER workspace_versions_prevent_mutation
BEFORE UPDATE OR DELETE
ON public.workspace_versions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_row_mutation();


CREATE TRIGGER workspace_membership_events_prevent_mutation
BEFORE UPDATE OR DELETE
ON public.workspace_membership_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_row_mutation();


-- Head tables intentionally do not receive immutability triggers.
--
-- They are mutable projections and must move forward when a new immutable
-- version or event is appended.


-- ============================================================================
-- Documentation stored in PostgreSQL
-- ============================================================================

COMMENT ON TABLE public.profiles IS
    'Stable application identity for a Supabase Auth user. Mutable profile attributes are stored in profile_versions.';

COMMENT ON TABLE public.profile_versions IS
    'Append-only immutable snapshots of profile state. Existing versions must never be updated or deleted.';

COMMENT ON TABLE public.profile_heads IS
    'Mutable projection pointing to each profile''s current immutable version.';

COMMENT ON TABLE public.workspaces IS
    'Stable workspace identity and immutable workspace creation facts.';

COMMENT ON TABLE public.workspace_versions IS
    'Append-only immutable snapshots of workspace state.';

COMMENT ON TABLE public.workspace_heads IS
    'Mutable projection pointing to each workspace''s current immutable version.';

COMMENT ON TABLE public.workspace_memberships IS
    'Stable identity of the relationship between one user and one workspace.';

COMMENT ON TABLE public.workspace_membership_events IS
    'Append-only business-event history describing a workspace membership lifecycle.';

COMMENT ON TABLE public.workspace_membership_heads IS
    'Mutable projection of the current state produced by the latest immutable membership event.';

COMMENT ON COLUMN public.profile_versions.supersedes_profile_version_id IS
    'The immediately preceding immutable profile version. NULL only for the first version.';

COMMENT ON COLUMN public.workspace_versions.supersedes_workspace_version_id IS
    'The immediately preceding immutable workspace version. NULL only for the first version.';

COMMENT ON COLUMN public.workspace_membership_events.sequence_number IS
    'Monotonically increasing sequence within one stable workspace membership.';

COMMENT ON COLUMN public.profile_heads.current_username IS
    'Duplicated current username used for efficient lookup and current-state uniqueness enforcement.';

COMMENT ON COLUMN public.workspace_heads.current_slug IS
    'Duplicated current workspace slug used for efficient lookup and current-state uniqueness enforcement.';