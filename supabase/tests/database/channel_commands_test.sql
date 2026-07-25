-- ============================================================================
-- Channel command tests
-- ============================================================================
--
-- These tests verify:
--
--   - workspace outsiders cannot create channels;
--   - active workspace owners and members can create channels;
--   - channel identities, versions, and heads are created consistently;
--   - channel slugs are unique within a workspace;
--   - ordinary members cannot update or archive channels;
--   - owners can append channel versions and archive channels;
--   - previous versions remain immutable;
--   - archived channels reject further mutations;
--   - archived workspaces reject new channels;
--   - authenticated users cannot write directly to channel tables.
--
-- The test runs inside a transaction and ends with ROLLBACK.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(29);


-- ============================================================================
-- Test identities
-- ============================================================================
--
-- Users:
--
--   6000...001  Workspace owner
--   6000...002  Workspace member
--   6000...003  Workspace outsider
-- ============================================================================

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES
(
    '60000000-0000-0000-0000-000000000001',
    'channel-owner@example.com',
    jsonb_build_object(
        'username', 'channel-owner',
        'display_name', 'Channel Owner'
    )
),
(
    '60000000-0000-0000-0000-000000000002',
    'channel-member@example.com',
    jsonb_build_object(
        'username', 'channel-member',
        'display_name', 'Channel Member'
    )
),
(
    '60000000-0000-0000-0000-000000000003',
    'channel-outsider@example.com',
    jsonb_build_object(
        'username', 'channel-outsider',
        'display_name', 'Channel Outsider'
    )
);


-- ============================================================================
-- Create the primary test workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            p_name => 'Channel Command Workspace',
            p_slug => 'channel-command-workspace',
            p_description => 'Workspace used by channel command tests'
        )
    $$,
    'The owner can create the channel-command test workspace'
);


RESET ROLE;


SELECT workspace_id
FROM public.workspaces
WHERE created_by =
    '60000000-0000-0000-0000-000000000001'::UUID
  AND workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_versions
      WHERE name = 'Channel Command Workspace'
  )
\gset workspace_


-- ============================================================================
-- Outsider creation is rejected
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000003';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => 'Unauthorized Channel',
                p_slug => 'unauthorized-channel',
                p_description => NULL
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '42501',
    NULL,
    'A workspace outsider cannot create a channel'
);


RESET ROLE;


-- ============================================================================
-- Owner creates the first channel
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => ' General ',
                p_slug => ' General ',
                p_description => ' General workspace discussion '
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active workspace owner can create a channel'
);


RESET ROLE;


SELECT channel_id
FROM public.channels
WHERE workspace_id = :'workspace_workspace_id'::UUID
  AND slug = 'general'
\gset channel_


-- ============================================================================
-- Initial aggregate state
-- ============================================================================

SELECT is(
    (
        SELECT count(*)
        FROM public.channels
        WHERE channel_id =
            :'channel_channel_id'::UUID
          AND workspace_id =
            :'workspace_workspace_id'::UUID
          AND slug = 'general'
          AND created_by =
            '60000000-0000-0000-0000-000000000001'::UUID
    ),
    1::BIGINT,
    'Channel creation inserts one stable channel identity'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_versions
        WHERE channel_id =
            :'channel_channel_id'::UUID
          AND version_number = 1
          AND name = 'General'
          AND description =
            'General workspace discussion'
          AND created_by =
            '60000000-0000-0000-0000-000000000001'::UUID
    ),
    1::BIGINT,
    'Channel creation inserts the normalized initial version'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_heads
        WHERE channel_id =
            :'channel_channel_id'::UUID
          AND workspace_id =
            :'workspace_workspace_id'::UUID
          AND latest_version_number = 1
          AND channel_status = 'active'
    ),
    1::BIGINT,
    'Channel creation initializes the active channel head'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                slug,
                version_number,
                name,
                description,
                channel_status
            FROM public.current_channels
            WHERE channel_id = %L::UUID
        $sql$,
        :'channel_channel_id'
    ),
    $$
        VALUES (
            'general'::TEXT,
            1,
            'General'::TEXT,
            'General workspace discussion'::TEXT,
            'active'::TEXT
        )
    $$,
    'The current channel projection exposes the initial state'
);


-- ============================================================================
-- Add an ordinary workspace member
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '60000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can add an ordinary member'
);


RESET ROLE;


-- ============================================================================
-- Ordinary members may create public channels
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => 'Member Created',
                p_slug => 'member-created',
                p_description =>
                    'A channel created by an ordinary member'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active ordinary member can create a public channel'
);


RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.channels
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
          AND slug = 'member-created'
          AND created_by =
            '60000000-0000-0000-0000-000000000002'::UUID
    ),
    1::BIGINT,
    'The member-created channel records the member as its creator'
);


-- ============================================================================
-- Workspace-scoped slug uniqueness
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000001';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => 'Duplicate General',
                p_slug => 'general',
                p_description => NULL
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '23505',
    NULL,
    'A channel slug cannot be reused within the same workspace'
);


RESET ROLE;


-- ============================================================================
-- Ordinary members cannot update channels
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.update_channel(
                p_channel_id => %L::UUID,
                p_name => 'Unauthorized Update',
                p_description =>
                    'Ordinary members cannot update channels'
            )
        $sql$,
        :'channel_channel_id'
    ),
    '42501',
    NULL,
    'An ordinary member cannot update a channel'
);


RESET ROLE;


-- ============================================================================
-- Owner appends a new version
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.update_channel(
                p_channel_id => %L::UUID,
                p_name => 'Updated General',
                p_description =>
                    'Updated general workspace discussion'
            )
        $sql$,
        :'channel_channel_id'
    ),
    'An active workspace owner can update a channel'
);


RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_versions
        WHERE channel_id =
            :'channel_channel_id'::UUID
    ),
    2::BIGINT,
    'Updating a channel appends a second immutable version'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                latest_version_number,
                channel_status
            FROM public.channel_heads
            WHERE channel_id = %L::UUID
        $sql$,
        :'channel_channel_id'
    ),
    $$
        VALUES (
            2,
            'active'::TEXT
        )
    $$,
    'The channel head advances to version 2'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                name,
                description
            FROM public.current_channels
            WHERE channel_id = %L::UUID
        $sql$,
        :'channel_channel_id'
    ),
    $$
        VALUES (
            2,
            'Updated General'::TEXT,
            'Updated general workspace discussion'::TEXT
        )
    $$,
    'The current projection exposes the updated channel version'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                name,
                description
            FROM public.channel_versions
            WHERE channel_id = %L::UUID
              AND version_number = 1
        $sql$,
        :'channel_channel_id'
    ),
    $$
        VALUES (
            'General'::TEXT,
            'General workspace discussion'::TEXT
        )
    $$,
    'Appending version 2 leaves version 1 unchanged'
);


-- ============================================================================
-- Ordinary members cannot archive channels
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.archive_channel(
                p_channel_id => %L::UUID
            )
        $sql$,
        :'channel_channel_id'
    ),
    '42501',
    NULL,
    'An ordinary member cannot archive a channel'
);


RESET ROLE;


-- ============================================================================
-- Owner archives the channel
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.archive_channel(
                p_channel_id => %L::UUID
            )
        $sql$,
        :'channel_channel_id'
    ),
    'An active workspace owner can archive a channel'
);


RESET ROLE;


SELECT is(
    (
        SELECT channel_status
        FROM public.channel_heads
        WHERE channel_id =
            :'channel_channel_id'::UUID
    ),
    'archived'::TEXT,
    'Archiving changes the channel head status to archived'
);


-- ============================================================================
-- Archived-channel mutations are rejected
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000001';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.update_channel(
                p_channel_id => %L::UUID,
                p_name => 'Post-Archive Update',
                p_description => NULL
            )
        $sql$,
        :'channel_channel_id'
    ),
    '55000',
    NULL,
    'An archived channel cannot be updated'
);


SELECT throws_ok(
    format(
        $sql$
            SELECT public.archive_channel(
                p_channel_id => %L::UUID
            )
        $sql$,
        :'channel_channel_id'
    ),
    '55000',
    NULL,
    'An archived channel cannot be archived again'
);


RESET ROLE;


-- ============================================================================
-- Immutable-table enforcement
-- ============================================================================

SELECT throws_ok(
    format(
        $sql$
            UPDATE public.channels
            SET slug = 'mutated-general'
            WHERE channel_id = %L::UUID
        $sql$,
        :'channel_channel_id'
    ),
    '55000',
    NULL,
    'Stable channel identities cannot be updated'
);


SELECT throws_ok(
    format(
        $sql$
            UPDATE public.channel_versions
            SET name = 'Mutated Version'
            WHERE channel_id = %L::UUID
              AND version_number = 1
        $sql$,
        :'channel_channel_id'
    ),
    '55000',
    NULL,
    'Immutable channel versions cannot be updated'
);


-- ============================================================================
-- Direct application-role write protection
-- ============================================================================

SELECT is(
    has_table_privilege(
        'authenticated',
        'public.channels',
        'INSERT'
    ),
    FALSE,
    'Authenticated users cannot insert channel identities directly'
);


SELECT is(
    has_table_privilege(
        'authenticated',
        'public.channel_heads',
        'UPDATE'
    ),
    FALSE,
    'Authenticated users cannot update channel heads directly'
);


-- ============================================================================
-- Archived workspace rejects new channel creation
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            p_name => 'Archived Channel Workspace',
            p_slug => 'archived-channel-workspace',
            p_description =>
                'Workspace archived before channel creation'
        )
    $$,
    'The owner can create a second workspace'
);


RESET ROLE;


SELECT workspace_id
FROM public.workspaces
WHERE created_by =
    '60000000-0000-0000-0000-000000000001'::UUID
  AND workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_versions
      WHERE name = 'Archived Channel Workspace'
  )
\gset archived_workspace_


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '60000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.archive_workspace(
                p_workspace_id => %L::UUID
            )
        $sql$,
        :'archived_workspace_workspace_id'
    ),
    'The owner can archive the second workspace'
);


SELECT throws_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => 'Rejected Channel',
                p_slug => 'rejected-channel',
                p_description => NULL
            )
        $sql$,
        :'archived_workspace_workspace_id'
    ),
    '55000',
    NULL,
    'A channel cannot be created in an archived workspace'
);


RESET ROLE;


SELECT *
FROM finish();

ROLLBACK;