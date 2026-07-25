-- ============================================================================
-- Message read-policy tests
-- ============================================================================
--
-- Verifies:
--
--   - active workspace members can read active messages;
--   - ordinary members see only the current immutable version;
--   - original authors can read complete revision history;
--   - workspace owners can read complete revision history;
--   - outsiders cannot read message data;
--   - deleted messages remain visible to ordinary members as placeholders;
--   - deleted content is hidden from ordinary members;
--   - authors and owners retain access to deleted content;
--   - removed members immediately lose all message access;
--   - anonymous users cannot read message projections;
--   - authenticated users cannot write directly to message tables.
--
-- The test runs inside a transaction and ends with ROLLBACK.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(37);


-- ============================================================================
-- Test identities
-- ============================================================================
--
-- Users:
--
--   9000...001  Workspace owner
--   9000...002  Message author
--   9000...003  Ordinary active member
--   9000...004  Workspace outsider
-- ============================================================================

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES
(
    '90000000-0000-0000-0000-000000000001',
    'message-policy-owner@example.com',
    jsonb_build_object(
        'username', 'message-policy-owner',
        'display_name', 'Message Policy Owner'
    )
),
(
    '90000000-0000-0000-0000-000000000002',
    'message-policy-author@example.com',
    jsonb_build_object(
        'username', 'message-policy-author',
        'display_name', 'Message Policy Author'
    )
),
(
    '90000000-0000-0000-0000-000000000003',
    'message-policy-member@example.com',
    jsonb_build_object(
        'username', 'message-policy-member',
        'display_name', 'Message Policy Member'
    )
),
(
    '90000000-0000-0000-0000-000000000004',
    'message-policy-outsider@example.com',
    jsonb_build_object(
        'username', 'message-policy-outsider',
        'display_name', 'Message Policy Outsider'
    )
);


-- ============================================================================
-- Create workspace
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            p_name => 'Message Policy Workspace',
            p_slug => 'message-policy-workspace',
            p_description =>
                'Workspace used for message read-policy tests'
        )
    $$,
    'The owner can create the message-policy workspace'
);


RESET ROLE;


SELECT workspace_id
FROM public.workspaces
WHERE created_by =
        '90000000-0000-0000-0000-000000000001'::UUID
  AND workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_versions
      WHERE name = 'Message Policy Workspace'
  )
\gset workspace_


-- ============================================================================
-- Add active members
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '90000000-0000-0000-0000-000000000002'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can add the message author'
);


SELECT lives_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '90000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can add the ordinary workspace member'
);


-- ============================================================================
-- Create active channel
-- ============================================================================

SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => 'General',
                p_slug => 'general',
                p_description =>
                    'General channel for message policy tests'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can create the message-policy channel'
);


RESET ROLE;


SELECT channel_id
FROM public.channels
WHERE workspace_id =
        :'workspace_workspace_id'::UUID
  AND slug = 'general'
\gset channel_


-- ============================================================================
-- Create and edit a message
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_message(
                p_channel_id => %L::UUID,
                p_content => 'Original policy-test message'
            )
        $sql$,
        :'channel_channel_id'
    ),
    'The active author can create a message'
);


RESET ROLE;


SELECT message_id
FROM public.messages
WHERE channel_id =
        :'channel_channel_id'::UUID
  AND author_user_id =
        '90000000-0000-0000-0000-000000000002'::UUID
ORDER BY created_at DESC
LIMIT 1
\gset message_


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.edit_message(
                p_message_id => %L::UUID,
                p_content => 'Updated policy-test message'
            )
        $sql$,
        :'message_message_id'
    ),
    'The original author can append message version 2'
);


RESET ROLE;


-- ============================================================================
-- Ordinary-member active-message visibility
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000003';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_messages
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    1::BIGINT,
    'An ordinary active member can read the current message projection'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                content,
                message_status,
                is_edited
            FROM public.current_messages
            WHERE message_id = %L::UUID
        $sql$,
        :'message_message_id'
    ),
    $$
        VALUES (
            2,
            'Updated policy-test message'::TEXT,
            'active'::TEXT,
            TRUE
        )
    $$,
    'An ordinary member sees current active-message content'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    1::BIGINT,
    'An ordinary member sees only the current immutable version'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
                :'message_message_id'::UUID
          AND version_number = 1
    ),
    0::BIGINT,
    'An ordinary member cannot read historical version 1'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.messages
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    1::BIGINT,
    'An ordinary member can read the stable message identity'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_heads
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    1::BIGINT,
    'An ordinary member can read the active message head'
);


RESET ROLE;


-- ============================================================================
-- Original-author history visibility
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000002';


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    2::BIGINT,
    'The original author can read complete revision history'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                content
            FROM public.message_versions
            WHERE message_id = %L::UUID
            ORDER BY version_number
        $sql$,
        :'message_message_id'
    ),
    $$
        VALUES
        (
            1,
            'Original policy-test message'::TEXT
        ),
        (
            2,
            'Updated policy-test message'::TEXT
        )
    $$,
    'The original author sees both immutable message versions'
);


RESET ROLE;


-- ============================================================================
-- Owner history visibility
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000001';


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    2::BIGINT,
    'An active workspace owner can read complete revision history'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                content
            FROM public.message_versions
            WHERE message_id = %L::UUID
            ORDER BY version_number
        $sql$,
        :'message_message_id'
    ),
    $$
        VALUES
        (
            1,
            'Original policy-test message'::TEXT
        ),
        (
            2,
            'Updated policy-test message'::TEXT
        )
    $$,
    'The owner can audit all immutable message versions'
);


RESET ROLE;


-- ============================================================================
-- Outsider isolation
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000004';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_messages
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    0::BIGINT,
    'A workspace outsider cannot read the current message projection'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    0::BIGINT,
    'A workspace outsider cannot read message versions'
);


RESET ROLE;


-- ============================================================================
-- Delete the message
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.delete_message(
                p_message_id => %L::UUID
            )
        $sql$,
        :'message_message_id'
    ),
    'The original author can delete the message'
);


RESET ROLE;


-- ============================================================================
-- Ordinary-member deleted-message placeholder
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000003';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_messages
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    1::BIGINT,
    'An ordinary member still sees a deleted-message placeholder'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                content,
                message_status,
                deleted_at IS NOT NULL
            FROM public.current_messages
            WHERE message_id = %L::UUID
        $sql$,
        :'message_message_id'
    ),
    $$
        VALUES (
            2,
            NULL::TEXT,
            'deleted'::TEXT,
            TRUE
        )
    $$,
    'The deleted placeholder hides retained message content'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    0::BIGINT,
    'An ordinary member cannot read any retained versions after deletion'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.messages
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    1::BIGINT,
    'The deleted message identity remains visible to an ordinary member'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_heads
        WHERE message_id =
                :'message_message_id'::UUID
          AND message_status = 'deleted'
    ),
    1::BIGINT,
    'The deleted message head remains visible to an ordinary member'
);


RESET ROLE;


-- ============================================================================
-- Author deleted-content audit access
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000002';


SELECT results_eq(
    format(
        $sql$
            SELECT
                content,
                message_status
            FROM public.current_messages
            WHERE message_id = %L::UUID
        $sql$,
        :'message_message_id'
    ),
    $$
        VALUES (
            'Updated policy-test message'::TEXT,
            'deleted'::TEXT
        )
    $$,
    'The active original author retains access to deleted current content'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    2::BIGINT,
    'The active original author retains complete deleted-message history'
);


RESET ROLE;


-- ============================================================================
-- Owner deleted-content audit access
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000001';


SELECT results_eq(
    format(
        $sql$
            SELECT
                content,
                message_status
            FROM public.current_messages
            WHERE message_id = %L::UUID
        $sql$,
        :'message_message_id'
    ),
    $$
        VALUES (
            'Updated policy-test message'::TEXT,
            'deleted'::TEXT
        )
    $$,
    'An active owner retains access to deleted current content'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    2::BIGINT,
    'An active owner retains complete deleted-message history'
);


-- ============================================================================
-- Remove the ordinary member
-- ============================================================================

SELECT lives_ok(
    format(
        $sql$
            SELECT public.remove_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '90000000-0000-0000-0000-000000000003'::UUID,
                p_reason =>
                    'Testing message read-access revocation'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can remove the ordinary workspace member'
);


RESET ROLE;


-- ============================================================================
-- Removed-member revocation
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '90000000-0000-0000-0000-000000000003';


SELECT is(
    (
        SELECT count(*)
        FROM public.current_messages
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    0::BIGINT,
    'A removed member cannot read deleted-message projections'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.messages
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    0::BIGINT,
    'A removed member cannot read stable message identities'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_heads
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    0::BIGINT,
    'A removed member cannot read message heads'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    0::BIGINT,
    'A removed member cannot read retained message history'
);


RESET ROLE;


-- ============================================================================
-- Anonymous access
-- ============================================================================

SET LOCAL ROLE anon;


SELECT throws_ok(
    $$
        SELECT count(*)
        FROM public.current_messages
    $$,
    '42501',
    NULL,
    'Anonymous users cannot read the current-message projection'
);


RESET ROLE;


-- ============================================================================
-- Direct-write protection
-- ============================================================================

SELECT is(
    has_table_privilege(
        'authenticated',
        'public.messages',
        'INSERT'
    ),
    FALSE,
    'Authenticated users cannot insert message identities directly'
);


SELECT is(
    has_table_privilege(
        'authenticated',
        'public.message_versions',
        'UPDATE'
    ),
    FALSE,
    'Authenticated users cannot update immutable message versions directly'
);


SELECT is(
    has_table_privilege(
        'authenticated',
        'public.message_heads',
        'UPDATE'
    ),
    FALSE,
    'Authenticated users cannot update message heads directly'
);


SELECT *
FROM finish();

ROLLBACK;