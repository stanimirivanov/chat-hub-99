-- ============================================================================
-- Workspace membership command tests
-- ============================================================================
--
-- These tests verify:
--
--   - only active workspace owners may add members;
--   - adding a member creates one stable membership identity;
--   - adding a member appends the initial joined event;
--   - membership heads expose the resulting current state;
--   - an already-active membership cannot be added again;
--   - ordinary members cannot manage membership;
--   - owners can promote and demote members;
--   - role changes append immutable events;
--   - a workspace cannot lose its final active owner;
--   - owners can remove active members;
--   - active members append a distinct left event when leaving their workspace;
--   - the final active owner cannot leave;
--   - owners can reinstate a left or removed membership without replacing its
--     stable identity or immutable history;
--   - removed members lose membership-management authority;
--   - membership history rejects UPDATE and DELETE.
--
-- The complete test runs inside a transaction and is rolled back.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(34);


-- ============================================================================
-- Test identities
-- ============================================================================
--
-- Inserting Auth users invokes the profile initialization trigger. Each user
-- therefore receives an active profile and may be used by membership commands.
--
-- Users:
--
--   3000...001  Initial workspace owner
--   3000...002  User who will be added, promoted, and become sole owner
--   3000...003  Additional active user used for authorization tests
-- ============================================================================

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES
(
    '30000000-0000-0000-0000-000000000001',
    'membership-owner@example.com',
    jsonb_build_object(
        'username', 'membership-owner',
        'display_name', 'Membership Owner'
    )
),
(
    '30000000-0000-0000-0000-000000000002',
    'membership-member@example.com',
    jsonb_build_object(
        'username', 'membership-member',
        'display_name', 'Membership Member'
    )
),
(
    '30000000-0000-0000-0000-000000000003',
    'membership-outsider@example.com',
    jsonb_build_object(
        'username', 'membership-outsider',
        'display_name', 'Membership Outsider'
    )
);


-- ============================================================================
-- Create workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            p_name => 'Membership Test Workspace',
            p_slug => 'membership-test-workspace',
            p_description => 'Workspace used by membership command tests'
        )
    $$,
    'The initial owner can create the test workspace'
);


RESET ROLE;


-- Capture the generated workspace identifier while running as the database
-- owner. Application roles intentionally have no direct read access to the
-- internal workspace identity table.
SELECT workspace_id
FROM public.workspaces
WHERE created_by =
    '30000000-0000-0000-0000-000000000001'::UUID
\gset workspace_


-- ============================================================================
-- Only owners can add members
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000003';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '42501',
    NULL,
    'A non-owner cannot add a workspace member'
);


RESET ROLE;


-- ============================================================================
-- Add member
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active workspace owner can add an active profile'
);


RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_memberships
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
          AND user_id =
            '30000000-0000-0000-0000-000000000002'::UUID
    ),
    1::BIGINT,
    'Adding a member creates one stable membership identity'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                sequence_number,
                event_type,
                role,
                performed_by
            FROM public.workspace_membership_events
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000002'::UUID
            ORDER BY sequence_number
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            1,
            'joined'::TEXT,
            'member'::TEXT,
            '30000000-0000-0000-0000-000000000001'::UUID
        )
    $$,
    'Adding a member appends the initial joined event'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                membership_role,
                membership_status,
                latest_event_sequence_number,
                latest_event_type
            FROM public.current_workspace_memberships
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000002'::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            'member'::TEXT,
            'active'::TEXT,
            1,
            'joined'::TEXT
        )
    $$,
    'The new membership head represents an active member'
);


-- ============================================================================
-- Active membership protection
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000001';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'An already-active workspace member cannot be added again'
);


RESET ROLE;


-- ============================================================================
-- Ordinary members cannot manage membership
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '42501',
    NULL,
    'An ordinary workspace member cannot add another member'
);


RESET ROLE;


-- ============================================================================
-- Promote member to owner
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.change_workspace_member_role(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000002'::UUID,
                p_role => 'owner'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active owner can promote an active member'
);


RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_membership_events
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
          AND user_id =
            '30000000-0000-0000-0000-000000000002'::UUID
    ),
    2::BIGINT,
    'Promoting a member appends a second membership event'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                membership_role,
                membership_status,
                latest_event_sequence_number,
                latest_event_type
            FROM public.current_workspace_memberships
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000002'::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            'owner'::TEXT,
            'active'::TEXT,
            2,
            'role_changed'::TEXT
        )
    $$,
    'The promoted membership head advances to an owner role'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                sequence_number,
                event_type,
                role
            FROM public.workspace_membership_events
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000002'::UUID
              AND sequence_number = 1
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            1,
            'joined'::TEXT,
            'member'::TEXT
        )
    $$,
    'Promoting a member leaves the original joined event unchanged'
);


-- ============================================================================
-- Demote the initial owner
-- ============================================================================
--
-- Two active owners now exist, so the initial owner may safely demote
-- themselves. The promoted user then becomes the only active owner.
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.change_workspace_member_role(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000001'::UUID,
                p_role => 'member'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'One of multiple active owners can be demoted'
);


RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_membership_heads
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
          AND membership_role = 'owner'
          AND membership_status = 'active'
    ),
    1::BIGINT,
    'The workspace retains exactly one active owner after the demotion'
);


-- ============================================================================
-- Last-owner protection
-- ============================================================================
--
-- User 3000...002 is now the only active owner. Demoting that membership would
-- leave the workspace without an active owner and must therefore fail.
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.change_workspace_member_role(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000002'::UUID,
                p_role => 'member'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'The last active workspace owner cannot be demoted'
);


RESET ROLE;


-- ============================================================================
-- Remove member
-- ============================================================================
--
-- The remaining owner removes the original owner, whose current role is now
-- member.
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.remove_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000001'::UUID,
                p_reason => 'No longer participating'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active owner can remove an active workspace member'
);


RESET ROLE;


SELECT results_eq(
    format(
        $sql$
            SELECT
                sequence_number,
                event_type,
                role,
                performed_by,
                reason
            FROM public.workspace_membership_events
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000001'::UUID
              AND sequence_number = 3
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            3,
            'removed'::TEXT,
            'member'::TEXT,
            '30000000-0000-0000-0000-000000000002'::UUID,
            'No longer participating'::TEXT
        )
    $$,
    'Removing a member appends the removed event'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                membership_role,
                membership_status,
                latest_event_sequence_number,
                latest_event_type
            FROM public.current_workspace_memberships
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000001'::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            'member'::TEXT,
            'removed'::TEXT,
            3,
            'removed'::TEXT
        )
    $$,
    'The removed membership head exposes the resulting current state'
);


-- ============================================================================
-- Removed users lose authority
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000001';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '42501',
    NULL,
    'A removed workspace member cannot add another member'
);


RESET ROLE;


-- ============================================================================
-- Members leave their workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

RESET request.jwt.claim.sub;


SELECT throws_ok(
    format(
        $sql$
            SELECT public.leave_workspace(
                p_workspace_id => %L::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '28000',
    NULL,
    'An authenticated identity is required to leave a workspace'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can add the member used by the departure tests'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000003';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.leave_workspace(
                p_workspace_id => %L::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active ordinary member can leave the workspace'
);


RESET ROLE;


SELECT results_eq(
    format(
        $sql$
            SELECT
                sequence_number,
                event_type,
                role,
                performed_by,
                reason
            FROM public.workspace_membership_events
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000003'::UUID
            ORDER BY sequence_number
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES
        (
            1,
            'joined'::TEXT,
            'member'::TEXT,
            '30000000-0000-0000-0000-000000000002'::UUID,
            NULL::TEXT
        ),
        (
            2,
            'left'::TEXT,
            'member'::TEXT,
            '30000000-0000-0000-0000-000000000003'::UUID,
            NULL::TEXT
        )
    $$,
    'Leaving appends a self-performed left event to immutable history'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                membership_role,
                membership_status,
                latest_event_sequence_number,
                latest_event_type
            FROM public.current_workspace_memberships
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000003'::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            'member'::TEXT,
            'left'::TEXT,
            2,
            'left'::TEXT
        )
    $$,
    'Departure advances the current membership head to left'
);


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000003';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_workspace_memberships
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
    ),
    0::BIGINT,
    'A member that left loses workspace membership directory access'
);


SELECT throws_ok(
    format(
        $sql$
            SELECT public.leave_workspace(
                p_workspace_id => %L::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'An inactive member cannot leave the workspace again'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.leave_workspace(
                p_workspace_id => %L::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'The final active workspace owner cannot leave'
);


RESET ROLE;


-- ============================================================================
-- Reinstate a former workspace member
-- ============================================================================
--
-- User 3000...003 left above. Adding that same active profile again must
-- advance its existing membership aggregate instead of creating another one.
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active owner can reinstate a former workspace member'
);


RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_memberships
        WHERE workspace_id =
            :'workspace_workspace_id'::UUID
          AND user_id =
            '30000000-0000-0000-0000-000000000003'::UUID
    ),
    1::BIGINT,
    'Reinstatement preserves the stable membership identity'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                sequence_number,
                event_type,
                role,
                performed_by
            FROM public.workspace_membership_events
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000003'::UUID
            ORDER BY sequence_number
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES
        (
            1,
            'joined'::TEXT,
            'member'::TEXT,
            '30000000-0000-0000-0000-000000000002'::UUID
        ),
        (
            2,
            'left'::TEXT,
            'member'::TEXT,
            '30000000-0000-0000-0000-000000000003'::UUID
        ),
        (
            3,
            'reinstated'::TEXT,
            'member'::TEXT,
            '30000000-0000-0000-0000-000000000002'::UUID
        )
    $$,
    'Reinstatement appends to the existing immutable membership history'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                membership_role,
                membership_status,
                latest_event_sequence_number,
                latest_event_type
            FROM public.current_workspace_memberships
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000003'::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            'member'::TEXT,
            'active'::TEXT,
            3,
            'reinstated'::TEXT
        )
    $$,
    'Reinstatement advances the existing head to an active default member'
);


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '30000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '30000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'A reinstated active member cannot be added again'
);


RESET ROLE;


-- ============================================================================
-- Event immutability
-- ============================================================================

SELECT throws_ok(
    format(
        $sql$
            UPDATE public.workspace_membership_events
            SET reason = 'Illegally modified'
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000001'::UUID
              AND sequence_number = 3
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'Updating an immutable membership event is rejected'
);


SELECT throws_ok(
    format(
        $sql$
            DELETE FROM public.workspace_membership_events
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '30000000-0000-0000-0000-000000000001'::UUID
              AND sequence_number = 3
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'Deleting an immutable membership event is rejected'
);


SELECT *
FROM finish();

ROLLBACK;
