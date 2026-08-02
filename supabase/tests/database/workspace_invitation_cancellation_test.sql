-- ============================================================================
-- Owner workspace-invitation listing and cancellation tests
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(19);


INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
(
    '81000000-0000-0000-0000-000000000001',
    'cancellation-owner@example.com',
    jsonb_build_object('username', 'cancellation-owner', 'display_name', 'Owner')
),
(
    '81000000-0000-0000-0000-000000000002',
    'cancellation-alpha@example.com',
    jsonb_build_object('username', 'cancellation-alpha', 'display_name', 'Alpha')
),
(
    '81000000-0000-0000-0000-000000000003',
    'cancellation-beta@example.com',
    jsonb_build_object('username', 'cancellation-beta', 'display_name', 'Beta')
),
(
    '81000000-0000-0000-0000-000000000004',
    'cancellation-outsider@example.com',
    jsonb_build_object('username', 'cancellation-outsider', 'display_name', 'Outsider')
);


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '81000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            'Cancellation Workspace',
            'cancellation-workspace',
            'Owner invitation management tests'
        )
    $$,
    'The owner can create a workspace for cancellation tests'
);

RESET ROLE;

SELECT workspace_id
FROM public.workspaces
WHERE created_by = '81000000-0000-0000-0000-000000000001'::UUID
  AND workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_heads
      WHERE current_slug = 'cancellation-workspace'
  )
\gset workspace_


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '81000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    format(
        $sql$
            SELECT public.invite_workspace_member(
                %L::UUID,
                '81000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can invite the first recipient'
);

SELECT lives_ok(
    format(
        $sql$
            SELECT public.invite_workspace_member(
                %L::UUID,
                '81000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can invite the second recipient'
);

SELECT is(
    (
        SELECT count(*)
        FROM public.list_pending_workspace_invitations_for_workspace(
            :'workspace_workspace_id'::UUID
        )
    ),
    2::BIGINT,
    'The owner can list both pending invitations'
);

SELECT results_eq(
    format(
        $sql$
            SELECT invited_username, invitation_status
            FROM public.list_pending_workspace_invitations_for_workspace(%L::UUID)
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES
            ('cancellation-alpha'::TEXT, 'pending'::TEXT),
            ('cancellation-beta'::TEXT, 'pending'::TEXT)
    $$,
    'The owner sees pending invitations enriched with current usernames'
);

RESET ROLE;

SELECT workspace_invitation_id
FROM public.workspace_invitations
WHERE workspace_id = :'workspace_workspace_id'::UUID
  AND invited_user_id = '81000000-0000-0000-0000-000000000002'::UUID
\gset invitation_


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '81000000-0000-0000-0000-000000000002';

SELECT throws_ok(
    format(
        $sql$
            SELECT *
            FROM public.list_pending_workspace_invitations_for_workspace(%L::UUID)
        $sql$,
        :'workspace_workspace_id'
    ),
    '42501',
    NULL,
    'An invited non-owner cannot list owner-managed invitations'
);

SELECT throws_ok(
    format(
        $sql$
            SELECT public.cancel_workspace_invitation(%L::UUID)
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    '42501',
    NULL,
    'The recipient cannot cancel their invitation as an owner action'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '81000000-0000-0000-0000-000000000004';

SELECT throws_ok(
    format(
        $sql$
            SELECT public.cancel_workspace_invitation(%L::UUID)
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    '42501',
    NULL,
    'An outsider cannot cancel another workspace invitation'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '81000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    format(
        $sql$
            SELECT public.cancel_workspace_invitation(%L::UUID)
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    'The active workspace owner can cancel a pending invitation'
);

RESET ROLE;

SELECT is(
    (
        SELECT invitation_status
        FROM public.workspace_invitation_heads
        WHERE workspace_invitation_id =
            :'invitation_workspace_invitation_id'::UUID
    ),
    'cancelled'::TEXT,
    'Cancellation advances the invitation head to cancelled'
);

SELECT results_eq(
    format(
        $sql$
            SELECT sequence_number, event_type, performed_by
            FROM public.workspace_invitation_events
            WHERE workspace_invitation_id = %L::UUID
            ORDER BY sequence_number
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    $$
        VALUES
            (
                1,
                'invited'::TEXT,
                '81000000-0000-0000-0000-000000000001'::UUID
            ),
            (
                2,
                'cancelled'::TEXT,
                '81000000-0000-0000-0000-000000000001'::UUID
            )
    $$,
    'Cancellation appends an immutable owner-performed event'
);


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '81000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT count(*) FROM public.list_pending_workspace_invitations()),
    0::BIGINT,
    'A cancelled invitation disappears from the recipient pending list'
);

SELECT throws_ok(
    format(
        $sql$
            SELECT public.accept_workspace_invitation(%L::UUID)
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    '55000',
    NULL,
    'A cancelled invitation cannot be accepted'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '81000000-0000-0000-0000-000000000001';

SELECT is(
    (
        SELECT count(*)
        FROM public.list_pending_workspace_invitations_for_workspace(
            :'workspace_workspace_id'::UUID
        )
    ),
    1::BIGINT,
    'The cancelled invitation disappears from the owner pending list'
);

SELECT throws_ok(
    format(
        $sql$
            SELECT public.cancel_workspace_invitation(%L::UUID)
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    '55000',
    NULL,
    'A terminal invitation cannot be cancelled again'
);

SELECT lives_ok(
    format(
        $sql$
            SELECT public.invite_workspace_member(
                %L::UUID,
                '81000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'A cancelled recipient may be invited again'
);

SELECT workspace_invitation_id
FROM public.workspace_invitation_heads
WHERE workspace_id = :'workspace_workspace_id'::UUID
  AND invited_user_id = '81000000-0000-0000-0000-000000000002'::UUID
  AND invitation_status = 'pending'
\gset archived_invitation_

SELECT lives_ok(
    format(
        $sql$
            SELECT public.archive_workspace(%L::UUID)
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can archive a workspace with pending invitations'
);

SELECT throws_ok(
    format(
        $sql$
            SELECT *
            FROM public.list_pending_workspace_invitations_for_workspace(%L::UUID)
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'Pending invitations cannot be listed for an archived workspace'
);

SELECT throws_ok(
    format(
        $sql$
            SELECT public.cancel_workspace_invitation(%L::UUID)
        $sql$,
        :'archived_invitation_workspace_invitation_id'
    ),
    '55000',
    NULL,
    'Pending invitations cannot be cancelled after workspace archival'
);

RESET ROLE;


SELECT * FROM finish();

ROLLBACK;
