-- ============================================================================
-- Immutable workspace command tests
-- ============================================================================
--
-- These tests verify:
--
--   - an authenticated active user can create a workspace;
--   - workspace creation appends the initial immutable workspace version;
--   - the creator receives an active owner membership;
--   - updating a workspace appends a new immutable version;
--   - the previous workspace version remains unchanged;
--   - the workspace head advances to the new version;
--   - archiving appends another immutable version;
--   - immutable workspace versions reject direct mutation.
--
-- The test runs inside a transaction and ends with ROLLBACK. No test users,
-- workspaces, versions, memberships, or events remain in the database.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(16);


-- ============================================================================
-- Test user
-- ============================================================================
--
-- Inserting the Auth user invokes the profile initialization trigger created by
-- the profile command migration. The resulting active profile allows the user
-- to create a workspace.
-- ============================================================================

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES (
    '20000000-0000-0000-0000-000000000001',
    'workspace-owner@example.com',
    jsonb_build_object(
        'username', 'workspace-owner',
        'display_name', 'Workspace Owner'
    )
);


-- ============================================================================
-- Create workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '20000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            p_name => 'Chat Hub',
            p_slug => 'chat-hub',
            p_description => 'Initial description'
        )
    $$,
    'An authenticated active user can create a workspace'
);


-- Return to the database owner before inspecting internal tables.
RESET ROLE;


-- Capture the generated workspace identifier as a psql variable.
--
-- The prefix "workspace_" means the workspace_id column becomes available as:
--
--   :'workspace_workspace_id'
--
-- The value is captured while running as the database owner because the
-- authenticated role intentionally has no direct SELECT privilege on the
-- internal stable-identity table.
SELECT workspace_id
FROM public.workspaces
WHERE created_by =
    '20000000-0000-0000-0000-000000000001'::UUID
\gset workspace_


SELECT is(
    (
        SELECT count(*)
        FROM public.workspaces
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    1::BIGINT,
    'Creating a workspace creates one stable workspace identity'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    1::BIGINT,
    'Creating a workspace creates one immutable workspace version'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                name,
                slug,
                description,
                status
            FROM public.workspace_versions
            WHERE workspace_id = %L::UUID
              AND version_number = 1
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            1,
            'Chat Hub'::TEXT,
            'chat-hub'::TEXT,
            'Initial description'::TEXT,
            'active'::TEXT
        )
    $$,
    'The initial workspace snapshot contains the supplied values'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_memberships
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
          AND user_id =
            '20000000-0000-0000-0000-000000000001'::UUID
    ),
    1::BIGINT,
    'Creating a workspace creates one stable owner membership'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                workspace_membership_events.sequence_number,
                workspace_membership_events.event_type,
                workspace_membership_events.role
            FROM public.workspace_membership_events
            WHERE workspace_membership_events.workspace_id = %L::UUID
              AND workspace_membership_events.user_id =
                  '20000000-0000-0000-0000-000000000001'::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            1,
            'joined'::TEXT,
            'owner'::TEXT
        )
    $$,
    'Creating a workspace appends the initial owner joined event'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                workspace_membership_heads.membership_role,
                workspace_membership_heads.membership_status
            FROM public.workspace_membership_heads
            WHERE workspace_membership_heads.workspace_id = %L::UUID
              AND workspace_membership_heads.user_id =
                  '20000000-0000-0000-0000-000000000001'::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            'owner'::TEXT,
            'active'::TEXT
        )
    $$,
    'The creator membership head represents an active owner'
);


-- ============================================================================
-- Update workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '20000000-0000-0000-0000-000000000001';


-- lives_ok() executes the supplied SQL string inside PostgreSQL.
--
-- A psql variable cannot therefore appear directly inside the quoted SQL.
-- format() resolves the captured identifier before lives_ok() executes it.
SELECT lives_ok(
    format(
        $sql$
            SELECT public.update_workspace(
                p_workspace_id => %L::UUID,
                p_name => 'Chat Hub Community',
                p_slug => 'chat-hub-community',
                p_description => 'Updated description'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active owner can update a workspace'
);


RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    2::BIGINT,
    'Updating a workspace appends a second immutable version'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                name,
                slug,
                description,
                status
            FROM public.workspace_versions
            WHERE workspace_id = %L::UUID
              AND version_number = 1
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            1,
            'Chat Hub'::TEXT,
            'chat-hub'::TEXT,
            'Initial description'::TEXT,
            'active'::TEXT
        )
    $$,
    'Updating a workspace leaves version 1 unchanged'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                name,
                slug,
                description,
                status
            FROM public.current_workspaces
            WHERE workspace_id = %L::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            2,
            'Chat Hub Community'::TEXT,
            'chat-hub-community'::TEXT,
            'Updated description'::TEXT,
            'active'::TEXT
        )
    $$,
    'The workspace head advances to version 2'
);


SELECT ok(
    (
        SELECT
            new_version.supersedes_workspace_version_id =
                previous_version.workspace_version_id
        FROM public.workspace_versions AS new_version
        INNER JOIN public.workspace_versions AS previous_version
            ON previous_version.workspace_id =
                new_version.workspace_id
            AND previous_version.version_number = 1
        WHERE new_version.workspace_id =
            :'workspace_workspace_id'::UUID
          AND new_version.version_number = 2
    ),
    'Workspace version 2 supersedes version 1'
);


-- ============================================================================
-- Archive workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '20000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.archive_workspace(
                p_workspace_id => %L::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active owner can archive a workspace'
);


RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    3::BIGINT,
    'Archiving a workspace appends a third immutable version'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                name,
                slug,
                status
            FROM public.current_workspaces
            WHERE workspace_id = %L::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            3,
            'Chat Hub Community'::TEXT,
            'chat-hub-community'::TEXT,
            'archived'::TEXT
        )
    $$,
    'The current workspace projection is archived'
);


-- ============================================================================
-- Immutability enforcement
-- ============================================================================

SELECT throws_ok(
    format(
        $sql$
            UPDATE public.workspace_versions
            SET name = 'Illegally Modified'
            WHERE workspace_id = %L::UUID
              AND version_number = 1
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'Updating an immutable workspace version is rejected'
);


SELECT *
FROM finish();

ROLLBACK;