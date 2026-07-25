-- ============================================================================
-- Workspace membership read-policy tests
-- ============================================================================
--
-- These tests verify:
--
--   - active members can read active workspace memberships;
--   - active members can read event history for active memberships;
--   - active owners can read removed membership records and history;
--   - ordinary members cannot read removed membership records;
--   - workspace outsiders cannot read membership data;
--   - removed users lose all workspace membership-directory access;
--   - anonymous users cannot read membership projections;
--   - authenticated users cannot mutate membership tables directly.
--
-- The test runs inside a transaction and ends with ROLLBACK.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(25);


-- ============================================================================
-- Test identities
-- ============================================================================
--
-- Users:
--
--   5000...001  Workspace owner
--   5000...002  Active ordinary member
--   5000...003  Member who will later be removed
--   5000...004  Authenticated workspace outsider
-- ============================================================================

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES
    (
        '50000000-0000-0000-0000-000000000001',
        'membership-policy-owner@example.com',
        jsonb_build_object(
                'username', 'membership-policy-owner',
                'display_name', 'Membership Policy Owner'
        )
    ),
    (
        '50000000-0000-0000-0000-000000000002',
        'membership-policy-member@example.com',
        jsonb_build_object(
                'username', 'membership-policy-member',
                'display_name', 'Membership Policy Member'
        )
    ),
    (
        '50000000-0000-0000-0000-000000000003',
        'membership-policy-removable@example.com',
        jsonb_build_object(
                'username', 'membership-policy-removable',
                'display_name', 'Membership Policy Removable'
        )
    ),
    (
        '50000000-0000-0000-0000-000000000004',
        'membership-policy-outsider@example.com',
        jsonb_build_object(
                'username', 'membership-policy-outsider',
                'display_name', 'Membership Policy Outsider'
        )
    );


-- ============================================================================
-- Create workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '50000000-0000-0000-0000-000000000001';


SELECT lives_ok(
               $$
                   SELECT public.create_workspace(
            p_name => 'Membership Policy Workspace',
            p_slug => 'membership-policy-workspace',
            p_description => 'Workspace used for membership-policy tests'
        )
    $$,
               'The owner can create the membership-policy test workspace'
       );


RESET ROLE;


SELECT workspace_id
FROM public.workspaces
WHERE created_by =
      '50000000-0000-0000-0000-000000000001'::UUID
    \gset workspace_


-- ============================================================================
-- Add two active members
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '50000000-0000-0000-0000-000000000001';


SELECT lives_ok(
               format(
                       $sql$
                           SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '50000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
                       :'workspace_workspace_id'
               ),
               'The owner can add the first active member'
       );


SELECT lives_ok(
               format(
                       $sql$
                           SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '50000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
                       :'workspace_workspace_id'
               ),
               'The owner can add the second active member'
       );


RESET ROLE;


-- ============================================================================
-- Active ordinary-member visibility
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '50000000-0000-0000-0000-000000000002';


SELECT is(
    (
    SELECT count(*)
    FROM public.current_workspace_memberships
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    3::BIGINT,
    'An active member can read all active memberships in the workspace'
    );


SELECT is(
    (
    SELECT count(*)
    FROM public.workspace_memberships
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    3::BIGINT,
    'An active member can read all active stable membership identities'
    );


SELECT is(
    (
    SELECT count(*)
    FROM public.workspace_membership_heads
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    AND membership_status = 'active'
    ),
    3::BIGINT,
    'An active member can read all active membership heads'
    );


SELECT is(
    (
    SELECT count(*)
    FROM public.workspace_membership_events
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    3::BIGINT,
    'An active member can read event history for active memberships'
    );


SELECT results_eq(
               format(
                       $sql$
                           SELECT
                user_id,
                       membership_role,
                       membership_status
                           FROM public.current_workspace_memberships
            WHERE workspace_id = %L::UUID
            ORDER BY user_id
        $sql$,
                       :'workspace_workspace_id'
               ),
               $$
                   VALUES
        (
            '50000000-0000-0000-0000-000000000001'::UUID,
            'owner'::TEXT,
            'active'::TEXT
        ),
               (
                '50000000-0000-0000-0000-000000000002'::UUID,
                'member'::TEXT,
                'active'::TEXT
                   ),
               (
                '50000000-0000-0000-0000-000000000003'::UUID,
                'member'::TEXT,
                'active'::TEXT
                   )
                   $$,
               'The active member sees the expected current membership directory'
       );


RESET ROLE;


-- ============================================================================
-- Outsider isolation
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '50000000-0000-0000-0000-000000000004';


SELECT is(
    (
    SELECT count(*)
    FROM public.current_workspace_memberships
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A workspace outsider cannot read the current membership directory'
    );


SELECT is(
    (
    SELECT count(*)
    FROM public.workspace_memberships
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A workspace outsider cannot read stable membership identities'
    );


SELECT is(
    (
    SELECT count(*)
    FROM public.workspace_membership_events
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A workspace outsider cannot read membership event history'
    );


RESET ROLE;


-- ============================================================================
-- Anonymous access
-- ============================================================================

SET LOCAL ROLE anon;


SELECT throws_ok(
               $$
                   SELECT count(*)
        FROM public.current_workspace_memberships
    $$,
               '42501',
               NULL,
               'Anonymous users cannot read current workspace memberships'
       );


RESET ROLE;


-- ============================================================================
-- Direct-write protection
-- ============================================================================

SELECT is(
    has_table_privilege(
    'authenticated',
    'public.workspace_memberships',
    'INSERT'
    ),
    FALSE,
    'Authenticated users do not have direct INSERT privilege on memberships'
    );


SELECT is(
    has_table_privilege(
    'authenticated',
    'public.workspace_membership_events',
    'UPDATE'
    ),
    FALSE,
    'Authenticated users do not have direct UPDATE privilege on membership events'
    );


SELECT is(
    has_table_privilege(
    'authenticated',
    'public.workspace_membership_heads',
    'UPDATE'
    ),
    FALSE,
    'Authenticated users do not have direct UPDATE privilege on membership heads'
    );


SELECT is(
    has_table_privilege(
    'authenticated',
    'public.workspace_membership_heads',
    'DELETE'
    ),
    FALSE,
    'Authenticated users do not have direct DELETE privilege on membership heads'
    );


-- ============================================================================
-- Remove one member
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '50000000-0000-0000-0000-000000000001';


SELECT lives_ok(
               format(
                       $sql$
                           SELECT public.remove_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '50000000-0000-0000-0000-000000000003'::UUID,
                p_reason => 'Testing removed-membership visibility'
            )
        $sql$,
                       :'workspace_workspace_id'
               ),
               'The owner can remove the second member'
       );


RESET ROLE;


-- ============================================================================
-- Ordinary members cannot read removed memberships
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '50000000-0000-0000-0000-000000000002';


SELECT is(
    (
    SELECT count(*)
    FROM public.current_workspace_memberships
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    2::BIGINT,
    'An ordinary member sees only active memberships after a removal'
    );


SELECT is(
    (
    SELECT count(*)
    FROM public.workspace_membership_heads
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    AND user_id =
    '50000000-0000-0000-0000-000000000003'::UUID
    ),
    0::BIGINT,
    'An ordinary member cannot read a removed membership head'
    );


SELECT is(
    (
    SELECT count(*)
    FROM public.workspace_membership_events
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    AND user_id =
    '50000000-0000-0000-0000-000000000003'::UUID
    ),
    0::BIGINT,
    'An ordinary member cannot read event history for a removed membership'
    );


RESET ROLE;


-- ============================================================================
-- Owners can audit removed memberships
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '50000000-0000-0000-0000-000000000001';


SELECT is(
    (
    SELECT count(*)
    FROM public.current_workspace_memberships
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    3::BIGINT,
    'An active owner can read active and removed memberships'
    );


SELECT results_eq(
               format(
                       $sql$
                           SELECT
                membership_role,
                       membership_status,
                       latest_event_sequence_number,
                       latest_event_type,
                       latest_event_reason
                           FROM public.current_workspace_memberships
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '50000000-0000-0000-0000-000000000003'::UUID
        $sql$,
                       :'workspace_workspace_id'
               ),
               $$
                   VALUES (
            'member'::TEXT,
            'removed'::TEXT,
            2,
            'removed'::TEXT,
            'Testing removed-membership visibility'::TEXT
        )
    $$,
               'An active owner can read the removed membership projection'
       );


SELECT is(
    (
    SELECT count(*)
    FROM public.workspace_membership_events
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    AND user_id =
    '50000000-0000-0000-0000-000000000003'::UUID
    ),
    2::BIGINT,
    'An active owner can read complete history for a removed membership'
    );


RESET ROLE;


-- ============================================================================
-- Removed users lose directory access
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '50000000-0000-0000-0000-000000000003';


SELECT is(
    (
    SELECT count(*)
    FROM public.current_workspace_memberships
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A removed user cannot read the current workspace membership directory'
    );


SELECT is(
    (
    SELECT count(*)
    FROM public.workspace_membership_events
    WHERE workspace_id =
    :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A removed user cannot read workspace membership event history'
    );


RESET ROLE;


SELECT *
FROM finish();

ROLLBACK;