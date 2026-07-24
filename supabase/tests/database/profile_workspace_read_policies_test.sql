-- ============================================================================
-- Profile and workspace read-policy tests
-- ============================================================================
--
-- These tests verify:
--
--   - authenticated users can read active profiles;
--   - authenticated users can read their own profile;
--   - anonymous users cannot read profile projections;
--   - active workspace members can read their workspace;
--   - unrelated authenticated users cannot read the workspace;
--   - only the current immutable workspace version is exposed;
--   - direct writes remain unavailable to authenticated users;
--   - removed members immediately lose workspace visibility.
--
-- The test runs inside a transaction and ends with ROLLBACK.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(22);


-- ============================================================================
-- Test identities
-- ============================================================================
--
-- Users:
--
--   4000...001  Workspace owner
--   4000...002  Workspace member
--   4000...003  Authenticated outsider
--
-- The Auth trigger creates an active profile for each user.
-- ============================================================================

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES
(
    '40000000-0000-0000-0000-000000000001',
    'read-policy-owner@example.com',
    jsonb_build_object(
        'username', 'read-policy-owner',
        'display_name', 'Read Policy Owner'
    )
),
(
    '40000000-0000-0000-0000-000000000002',
    'read-policy-member@example.com',
    jsonb_build_object(
        'username', 'read-policy-member',
        'display_name', 'Read Policy Member'
    )
),
(
    '40000000-0000-0000-0000-000000000003',
    'read-policy-outsider@example.com',
    jsonb_build_object(
        'username', 'read-policy-outsider',
        'display_name', 'Read Policy Outsider'
    )
);


-- ============================================================================
-- Create workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            p_name => 'Read Policy Workspace',
            p_slug => 'read-policy-workspace',
            p_description => 'Initial workspace description'
        )
    $$,
    'The owner can create the read-policy test workspace'
);


RESET ROLE;


SELECT workspace_id
FROM public.workspaces
WHERE created_by =
    '40000000-0000-0000-0000-000000000001'::UUID
\gset workspace_


-- ============================================================================
-- Add an active member
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '40000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can add the workspace member'
);


RESET ROLE;


-- ============================================================================
-- Profile visibility
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000001';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_profiles
        WHERE user_id IN (
            '40000000-0000-0000-0000-000000000001'::UUID,
            '40000000-0000-0000-0000-000000000002'::UUID,
            '40000000-0000-0000-0000-000000000003'::UUID
        )
    ),
    3::BIGINT,
    'An authenticated user can read all active test profiles'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.current_profiles
        WHERE user_id =
            '40000000-0000-0000-0000-000000000001'::UUID
    ),
    1::BIGINT,
    'An authenticated user can read their own current profile'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.profile_versions
        WHERE user_id =
            '40000000-0000-0000-0000-000000000002'::UUID
    ),
    1::BIGINT,
    'An authenticated user can read another active current profile version'
);


RESET ROLE;


-- The anonymous role has no SELECT privilege on the profile projection.
SET LOCAL ROLE anon;


SELECT throws_ok(
    $$
        SELECT count(*)
        FROM public.current_profiles
    $$,
    '42501',
    NULL,
    'Anonymous users cannot read current profiles'
);


RESET ROLE;


-- ============================================================================
-- Workspace visibility for the owner
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000001';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_workspaces
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    1::BIGINT,
    'An active workspace owner can read the current workspace'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.workspaces
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    1::BIGINT,
    'An active workspace owner can read the stable workspace identity'
);


RESET ROLE;


-- ============================================================================
-- Workspace visibility for an active member
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000002';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_workspaces
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    1::BIGINT,
    'An active workspace member can read the current workspace'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    1::BIGINT,
    'An active member initially sees one current workspace version'
);


RESET ROLE;


-- ============================================================================
-- Workspace isolation
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000003';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_workspaces
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'An authenticated outsider cannot read the workspace projection'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.workspaces
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'An authenticated outsider cannot read the workspace identity'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'An authenticated outsider cannot read workspace versions'
);


RESET ROLE;


-- ============================================================================
-- Current-version filtering
-- ============================================================================
--
-- Updating the workspace appends version 2. RLS must continue to expose only
-- the version referenced by workspace_heads.
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.update_workspace(
                p_workspace_id => %L::UUID,
                p_name => 'Updated Read Policy Workspace',
                p_slug => 'updated-read-policy-workspace',
                p_description => 'Updated workspace description'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can append a new workspace version'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    1::BIGINT,
    'RLS exposes only one current immutable workspace version'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                name,
                slug
            FROM public.workspace_versions
            WHERE workspace_id = %L::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            2,
            'Updated Read Policy Workspace'::TEXT,
            'updated-read-policy-workspace'::TEXT
        )
    $$,
    'The visible immutable workspace version is version 2'
);


RESET ROLE;


-- Confirm that two immutable versions actually exist when inspected by the
-- database owner. This proves the previous test filtered history rather than
-- observing a table containing only one row.
SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    2::BIGINT,
    'The database retains both immutable workspace versions'
);


-- ============================================================================
-- Direct-write protection
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000001';


SELECT is(
    has_table_privilege(
        'authenticated',
        'public.profile_heads',
        'UPDATE'
    ),
    FALSE,
    'Authenticated users do not have direct UPDATE privilege on profile heads'
);


SELECT is(
    has_table_privilege(
        'authenticated',
        'public.workspace_heads',
        'UPDATE'
    ),
    FALSE,
    'Authenticated users do not have direct UPDATE privilege on workspace heads'
);


RESET ROLE;


-- ============================================================================
-- Removed-member visibility
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.remove_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '40000000-0000-0000-0000-000000000002'::UUID,
                p_reason => 'Testing workspace access revocation'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can remove the active workspace member'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '40000000-0000-0000-0000-000000000002';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_workspaces
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A removed member can no longer read the workspace projection'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_versions
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A removed member can no longer read the current workspace version'
);


RESET ROLE;


SELECT *
FROM finish();

ROLLBACK;