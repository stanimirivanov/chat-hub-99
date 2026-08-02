-- ============================================================================
-- Workspace invitation command and read-policy tests
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(35);


INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
(
    '80000000-0000-0000-0000-000000000001',
    'invitation-owner@example.com',
    jsonb_build_object('username', 'invitation-owner', 'display_name', 'Owner')
),
(
    '80000000-0000-0000-0000-000000000002',
    'invitation-recipient@example.com',
    jsonb_build_object('username', 'invitation-recipient', 'display_name', 'Recipient')
),
(
    '80000000-0000-0000-0000-000000000003',
    'invitation-second@example.com',
    jsonb_build_object('username', 'invitation-second', 'display_name', 'Second recipient')
),
(
    '80000000-0000-0000-0000-000000000004',
    'invitation-outsider@example.com',
    jsonb_build_object('username', 'invitation-outsider', 'display_name', 'Outsider')
);


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            'Invitation Workspace',
            'invitation-workspace',
            'Consent tests'
        )
    $$,
    'The owner can create the invitation workspace'
);

RESET ROLE;

SELECT workspace_id
FROM public.workspaces
WHERE created_by = '80000000-0000-0000-0000-000000000001'::UUID
\gset workspace_


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    format(
        $sql$
            SELECT public.invite_workspace_member(
                %L::UUID,
                '80000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'An active owner can create a pending invitation'
);

RESET ROLE;

SELECT workspace_invitation_id
FROM public.workspace_invitations
WHERE workspace_id = :'workspace_workspace_id'::UUID
  AND invited_user_id =
      '80000000-0000-0000-0000-000000000002'::UUID
\gset invitation_

SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_invitations
        WHERE workspace_invitation_id =
            :'invitation_workspace_invitation_id'::UUID
    ),
    1::BIGINT,
    'Invitation creation stores one stable identity'
);

SELECT results_eq(
    format(
        $sql$
            SELECT sequence_number, event_type, performed_by
            FROM public.workspace_invitation_events
            WHERE workspace_invitation_id = %L::UUID
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    $$
        VALUES (
            1,
            'invited'::TEXT,
            '80000000-0000-0000-0000-000000000001'::UUID
        )
    $$,
    'Invitation creation appends an immutable invited event'
);

SELECT is(
    (
        SELECT invitation_status
        FROM public.workspace_invitation_heads
        WHERE workspace_invitation_id =
            :'invitation_workspace_invitation_id'::UUID
    ),
    'pending'::TEXT,
    'The invitation head starts pending'
);


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';

SELECT throws_ok(
    format(
        $sql$
            SELECT public.invite_workspace_member(
                %L::UUID,
                '80000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'A duplicate pending invitation is rejected'
);

SELECT throws_ok(
    format(
        $sql$
            SELECT public.invite_workspace_member(
                %L::UUID,
                '80000000-0000-0000-0000-000000000001'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '55000',
    NULL,
    'An active workspace member cannot be invited'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT count(*) FROM public.list_pending_workspace_invitations()),
    1::BIGINT,
    'The recipient lists their pending invitation'
);

SELECT results_eq(
    $$
        SELECT workspace_name, workspace_slug, invitation_status
        FROM public.list_pending_workspace_invitations()
    $$,
    $$
        VALUES (
            'Invitation Workspace'::TEXT,
            'invitation-workspace'::TEXT,
            'pending'::TEXT
        )
    $$,
    'The recipient projection exposes current workspace presentation'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000004';

SELECT is(
    (SELECT count(*) FROM public.list_pending_workspace_invitations()),
    0::BIGINT,
    'An outsider cannot list another recipient invitation'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';

SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_invitations
        WHERE workspace_invitation_id =
            :'invitation_workspace_invitation_id'::UUID
    ),
    1::BIGINT,
    'RLS lets a recipient read their invitation identity'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';

SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_invitation_heads
        WHERE workspace_invitation_id =
            :'invitation_workspace_invitation_id'::UUID
    ),
    1::BIGINT,
    'RLS lets an active owner read workspace invitation heads'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000004';

SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_invitation_heads
        WHERE workspace_invitation_id =
            :'invitation_workspace_invitation_id'::UUID
    ),
    0::BIGINT,
    'RLS hides invitation heads from outsiders'
);

SELECT throws_ok(
    format(
        $sql$
            SELECT public.accept_workspace_invitation(%L::UUID)
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    '42501',
    NULL,
    'Only the addressed recipient may accept an invitation'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';

SELECT lives_ok(
    format(
        $sql$
            SELECT public.accept_workspace_invitation(%L::UUID)
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    'The addressed recipient can accept a pending invitation'
);

RESET ROLE;

SELECT is(
    (
        SELECT invitation_status
        FROM public.workspace_invitation_heads
        WHERE workspace_invitation_id =
            :'invitation_workspace_invitation_id'::UUID
    ),
    'accepted'::TEXT,
    'Acceptance advances the invitation head'
);

SELECT results_eq(
    format(
        $sql$
            SELECT membership_role, membership_status
            FROM public.workspace_membership_heads
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '80000000-0000-0000-0000-000000000002'::UUID
        $sql$,
        :'workspace_workspace_id'
    ),
    $$ VALUES ('member'::TEXT, 'active'::TEXT) $$,
    'Acceptance creates active default-member access'
);

SELECT results_eq(
    format(
        $sql$
            SELECT event_type, performed_by
            FROM public.workspace_membership_events
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '80000000-0000-0000-0000-000000000002'::UUID
            ORDER BY sequence_number
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            'joined'::TEXT,
            '80000000-0000-0000-0000-000000000002'::UUID
        )
    $$,
    'The recipient is the actor recorded for invitation-based membership'
);

SELECT results_eq(
    format(
        $sql$
            SELECT sequence_number, event_type
            FROM public.workspace_invitation_events
            WHERE workspace_invitation_id = %L::UUID
            ORDER BY sequence_number
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    $$ VALUES (1, 'invited'::TEXT), (2, 'accepted'::TEXT) $$,
    'Acceptance appends without rewriting invitation history'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';

SELECT is(
    (SELECT count(*) FROM public.list_pending_workspace_invitations()),
    0::BIGINT,
    'Accepted invitations leave the pending recipient list'
);

SELECT lives_ok(
    format(
        $sql$ SELECT public.leave_workspace(%L::UUID) $sql$,
        :'workspace_workspace_id'
    ),
    'The accepted member can later leave the workspace'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    format(
        $sql$
            SELECT public.invite_workspace_member(
                %L::UUID,
                '80000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'A former member can receive a new invitation'
);

RESET ROLE;

SELECT workspace_invitations.workspace_invitation_id
FROM public.workspace_invitations
INNER JOIN public.workspace_invitation_heads
    ON workspace_invitation_heads.workspace_invitation_id =
        workspace_invitations.workspace_invitation_id
WHERE workspace_invitations.workspace_id = :'workspace_workspace_id'::UUID
  AND workspace_invitations.invited_user_id =
      '80000000-0000-0000-0000-000000000002'::UUID
  AND workspace_invitation_heads.invitation_status = 'pending'
\gset reinvitation_


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';

SELECT lives_ok(
    format(
        $sql$ SELECT public.accept_workspace_invitation(%L::UUID) $sql$,
        :'reinvitation_workspace_invitation_id'
    ),
    'A former member can accept and reinstate access'
);

RESET ROLE;

SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_memberships
        WHERE workspace_id = :'workspace_workspace_id'::UUID
          AND user_id =
              '80000000-0000-0000-0000-000000000002'::UUID
    ),
    1::BIGINT,
    'Reinstatement preserves the stable membership identity'
);

SELECT results_eq(
    format(
        $sql$
            SELECT event_type, performed_by
            FROM public.workspace_membership_events
            WHERE workspace_id = %L::UUID
              AND user_id =
                  '80000000-0000-0000-0000-000000000002'::UUID
            ORDER BY sequence_number DESC
            LIMIT 1
        $sql$,
        :'workspace_workspace_id'
    ),
    $$
        VALUES (
            'reinstated'::TEXT,
            '80000000-0000-0000-0000-000000000002'::UUID
        )
    $$,
    'Invitation acceptance records recipient-driven reinstatement'
);


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    format(
        $sql$
            SELECT public.invite_workspace_member(
                %L::UUID,
                '80000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can invite a second recipient'
);

RESET ROLE;

SELECT workspace_invitation_id
FROM public.workspace_invitations
WHERE workspace_id = :'workspace_workspace_id'::UUID
  AND invited_user_id =
      '80000000-0000-0000-0000-000000000003'::UUID
ORDER BY created_at DESC, workspace_invitation_id DESC
LIMIT 1
\gset declined_


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000003';

SELECT is(
    (SELECT count(*) FROM public.list_pending_workspace_invitations()),
    1::BIGINT,
    'The second recipient sees the pending invitation'
);

SELECT lives_ok(
    format(
        $sql$ SELECT public.decline_workspace_invitation(%L::UUID) $sql$,
        :'declined_workspace_invitation_id'
    ),
    'The second recipient can decline the invitation'
);

RESET ROLE;

SELECT is(
    (
        SELECT invitation_status
        FROM public.workspace_invitation_heads
        WHERE workspace_invitation_id =
            :'declined_workspace_invitation_id'::UUID
    ),
    'declined'::TEXT,
    'Decline advances the invitation head'
);

SELECT is(
    (
        SELECT count(*)
        FROM public.workspace_memberships
        WHERE workspace_id = :'workspace_workspace_id'::UUID
          AND user_id =
              '80000000-0000-0000-0000-000000000003'::UUID
    ),
    0::BIGINT,
    'Declining does not create workspace membership'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000003';

SELECT is(
    (SELECT count(*) FROM public.list_pending_workspace_invitations()),
    0::BIGINT,
    'Declined invitations leave the pending recipient list'
);

RESET ROLE;


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';

SELECT lives_ok(
    format(
        $sql$
            SELECT public.invite_workspace_member(
                %L::UUID,
                '80000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'A declined recipient may be invited again'
);

RESET ROLE;


SELECT throws_ok(
    format(
        $sql$
            UPDATE public.workspace_invitations
            SET invited_user_id =
                '80000000-0000-0000-0000-000000000004'::UUID
            WHERE workspace_invitation_id = %L::UUID
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    '55000',
    NULL,
    'Stable invitation identities reject UPDATE'
);

SELECT throws_ok(
    format(
        $sql$
            DELETE FROM public.workspace_invitation_events
            WHERE workspace_invitation_id = %L::UUID
        $sql$,
        :'invitation_workspace_invitation_id'
    ),
    '55000',
    NULL,
    'Invitation events reject DELETE'
);


SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';

SELECT throws_ok(
    format(
        $sql$
            INSERT INTO public.workspace_invitations (
                workspace_id,
                invited_user_id
            )
            VALUES (
                %L::UUID,
                '80000000-0000-0000-0000-000000000004'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    '42501',
    NULL,
    'Authenticated users cannot bypass invitation commands with direct writes'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
