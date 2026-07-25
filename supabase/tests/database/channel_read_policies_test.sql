-- ============================================================================
-- Channel read-policy tests
-- ============================================================================
--
-- These tests verify:
--
--   - active workspace members can read active channels;
--   - ordinary members see only the current immutable channel version;
--   - active workspace owners can read complete version history;
--   - ordinary members cannot read archived channels;
--   - active owners can read archived channels;
--   - workspace outsiders cannot read channel data;
--   - removed members immediately lose channel access;
--   - anonymous users cannot read channel projections;
--   - authenticated users cannot mutate channel tables directly.
--
-- The test runs inside a transaction and ends with ROLLBACK.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(32);


-- ============================================================================
-- Test identities
-- ============================================================================
--
-- Users:
--
--   7000...001  Workspace owner
--   7000...002  Active workspace member
--   7000...003  Authenticated workspace outsider
-- ============================================================================

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES
(
    '70000000-0000-0000-0000-000000000001',
    'channel-policy-owner@example.com',
    jsonb_build_object(
        'username', 'channel-policy-owner',
        'display_name', 'Channel Policy Owner'
    )
),
(
    '70000000-0000-0000-0000-000000000002',
    'channel-policy-member@example.com',
    jsonb_build_object(
        'username', 'channel-policy-member',
        'display_name', 'Channel Policy Member'
    )
),
(
    '70000000-0000-0000-0000-000000000003',
    'channel-policy-outsider@example.com',
    jsonb_build_object(
        'username', 'channel-policy-outsider',
        'display_name', 'Channel Policy Outsider'
    )
);


-- ============================================================================
-- Create workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            p_name => 'Channel Policy Workspace',
            p_slug => 'channel-policy-workspace',
            p_description => 'Workspace used for channel read-policy tests'
        )
    $$,
    'The owner can create the channel-policy test workspace'
);


RESET ROLE;


SELECT workspace_id
FROM public.workspaces
WHERE created_by =
    '70000000-0000-0000-0000-000000000001'::UUID
  AND workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_versions
      WHERE name = 'Channel Policy Workspace'
  )
\gset workspace_


-- ============================================================================
-- Add an active workspace member
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '70000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can add the active workspace member'
);


RESET ROLE;


-- ============================================================================
-- Create two active channels
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => 'General',
                p_slug => 'general',
                p_description => 'General workspace discussion'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can create the General channel'
);


SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => 'Engineering',
                p_slug => 'engineering',
                p_description => 'Engineering discussion'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can create the Engineering channel'
);


RESET ROLE;


SELECT channel_id
FROM public.channels
WHERE workspace_id = :'workspace_workspace_id'::UUID
  AND slug = 'general'
\gset general_channel_


SELECT channel_id
FROM public.channels
WHERE workspace_id = :'workspace_workspace_id'::UUID
  AND slug = 'engineering'
\gset engineering_channel_


-- ============================================================================
-- Active member visibility
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000002';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_channels
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    2::BIGINT,
    'An active workspace member can read all active current channels'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channels
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    2::BIGINT,
    'An active workspace member can read active channel identities'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_heads
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
          AND channel_status = 'active'
    ),
    2::BIGINT,
    'An active workspace member can read active channel heads'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_versions
        WHERE channel_id IN (
            :'general_channel_channel_id'::UUID,
            :'engineering_channel_channel_id'::UUID
        )
    ),
    2::BIGINT,
    'An active workspace member initially sees one current version per channel'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                slug,
                name,
                channel_status
            FROM public.current_channels
            WHERE workspace_id = %L::UUID
            ORDER BY slug
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES
        (
            'engineering'::TEXT,
            'Engineering'::TEXT,
            'active'::TEXT
        ),
        (
            'general'::TEXT,
            'General'::TEXT,
            'active'::TEXT
        )
    $$,
    'The member sees the expected active channel directory'
);


RESET ROLE;


-- ============================================================================
-- Outsider isolation
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000003';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_channels
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A workspace outsider cannot read current channels'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channels
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A workspace outsider cannot read channel identities'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_heads
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A workspace outsider cannot read channel heads'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_versions
        WHERE channel_id =
            :'general_channel_channel_id'::UUID
    ),
    0::BIGINT,
    'A workspace outsider cannot read channel versions'
);


RESET ROLE;


-- ============================================================================
-- Append a second General version
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.update_channel(
                p_channel_id => %L::UUID,
                p_name => 'Updated General',
                p_description => 'Updated general discussion'
            )
        $sql$,
        :'general_channel_channel_id'
    ),
    'The owner can append a new General channel version'
);


RESET ROLE;


-- ============================================================================
-- Ordinary members see only the current version
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000002';


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_versions
        WHERE channel_id =
            :'general_channel_channel_id'::UUID
    ),
    1::BIGINT,
    'An ordinary member sees only one current General channel version'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                name,
                description
            FROM public.channel_versions
            WHERE channel_id = %L::UUID
        $sql$,
        :'general_channel_channel_id'
    ),
    $$
        VALUES (
            2,
            'Updated General'::TEXT,
            'Updated general discussion'::TEXT
        )
    $$,
    'The ordinary member sees version 2 rather than historical version 1'
);


RESET ROLE;


-- ============================================================================
-- Owners see complete immutable history
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000001';


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_versions
        WHERE channel_id =
            :'general_channel_channel_id'::UUID
    ),
    2::BIGINT,
    'An active owner can read complete General channel history'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                name
            FROM public.channel_versions
            WHERE channel_id = %L::UUID
            ORDER BY version_number
        $sql$,
        :'general_channel_channel_id'
    ),
    $$
        VALUES
        (
            1,
            'General'::TEXT
        ),
        (
            2,
            'Updated General'::TEXT
        )
    $$,
    'The owner can read both immutable General channel versions'
);


-- ============================================================================
-- Archive Engineering
-- ============================================================================

SELECT lives_ok(
    format(
        $sql$
            SELECT public.archive_channel(
                p_channel_id => %L::UUID
            )
        $sql$,
        :'engineering_channel_channel_id'
    ),
    'The owner can archive the Engineering channel'
);


RESET ROLE;


-- ============================================================================
-- Ordinary members cannot see archived channels
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000002';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_channels
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    1::BIGINT,
    'An ordinary member sees only the remaining active channel'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channels
        WHERE channel_id =
            :'engineering_channel_channel_id'::UUID
    ),
    0::BIGINT,
    'An ordinary member cannot read an archived channel identity'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_heads
        WHERE channel_id =
            :'engineering_channel_channel_id'::UUID
    ),
    0::BIGINT,
    'An ordinary member cannot read an archived channel head'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_versions
        WHERE channel_id =
            :'engineering_channel_channel_id'::UUID
    ),
    0::BIGINT,
    'An ordinary member cannot read versions belonging to an archived channel'
);


RESET ROLE;


-- ============================================================================
-- Owners can audit archived channels
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000001';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_channels
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    2::BIGINT,
    'An active owner can read active and archived channel projections'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                slug,
                name,
                channel_status
            FROM public.current_channels
            WHERE channel_id = %L::UUID
        $sql$,
        :'engineering_channel_channel_id'
    ),
    $$
        VALUES (
            'engineering'::TEXT,
            'Engineering'::TEXT,
            'archived'::TEXT
        )
    $$,
    'An active owner can read the archived Engineering channel'
);


RESET ROLE;


-- ============================================================================
-- Removed members immediately lose channel access
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.remove_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '70000000-0000-0000-0000-000000000002'::UUID,
                p_reason => 'Testing channel access revocation'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can remove the active workspace member'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '70000000-0000-0000-0000-000000000002';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_channels
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A removed workspace member cannot read current channels'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.channel_versions
        WHERE channel_id =
            :'general_channel_channel_id'::UUID
    ),
    0::BIGINT,
    'A removed workspace member cannot read channel versions'
);


RESET ROLE;


-- ============================================================================
-- Anonymous access
-- ============================================================================

SET LOCAL ROLE anon;


SELECT throws_ok(
    $$
        SELECT count(*)
        FROM public.current_channels
    $$,
    '42501',
    NULL,
    'Anonymous users cannot read current channels'
);


RESET ROLE;


-- ============================================================================
-- Direct-write protection
-- ============================================================================

SELECT is(
    has_table_privilege(
        'authenticated',
        'public.channels',
        'INSERT'
    ),
    FALSE,
    'Authenticated users do not have direct INSERT privilege on channels'
);


SELECT is(
    has_table_privilege(
        'authenticated',
        'public.channel_versions',
        'UPDATE'
    ),
    FALSE,
    'Authenticated users do not have direct UPDATE privilege on channel versions'
);


SELECT is(
    has_table_privilege(
        'authenticated',
        'public.channel_heads',
        'UPDATE'
    ),
    FALSE,
    'Authenticated users do not have direct UPDATE privilege on channel heads'
);


SELECT *
FROM finish();

ROLLBACK;