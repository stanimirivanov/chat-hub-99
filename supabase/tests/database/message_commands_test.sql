-- ============================================================================
-- Message command tests
-- ============================================================================
--
-- Verifies:
--
--   - active members can create messages in active channels;
--   - outsiders and removed members cannot create messages;
--   - initial identity, version, and head rows are consistent;
--   - blank content is rejected;
--   - only the original author can edit;
--   - edits append immutable sequential versions;
--   - no-op edits are rejected;
--   - authors can delete their own messages;
--   - owners can moderate messages;
--   - ordinary non-authors cannot delete messages;
--   - deleted messages cannot be edited or deleted again;
--   - removed authors lose mutation authority;
--   - archived channels and workspaces reject message creation;
--   - immutable rows cannot be changed;
--   - application roles have no direct table-write privileges.
--
-- The test runs inside a transaction and ends with ROLLBACK.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(41);


-- ============================================================================
-- Test identities
-- ============================================================================
--
-- Users:
--
--   8000...001  Workspace owner
--   8000...002  Message author
--   8000...003  Other active member
--   8000...004  Workspace outsider
-- ============================================================================

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES
(
    '80000000-0000-0000-0000-000000000001',
    'message-owner@example.com',
    jsonb_build_object(
        'username', 'message-owner',
        'display_name', 'Message Owner'
    )
),
(
    '80000000-0000-0000-0000-000000000002',
    'message-author@example.com',
    jsonb_build_object(
        'username', 'message-author',
        'display_name', 'Message Author'
    )
),
(
    '80000000-0000-0000-0000-000000000003',
    'message-member@example.com',
    jsonb_build_object(
        'username', 'message-member',
        'display_name', 'Message Member'
    )
),
(
    '80000000-0000-0000-0000-000000000004',
    'message-outsider@example.com',
    jsonb_build_object(
        'username', 'message-outsider',
        'display_name', 'Message Outsider'
    )
);


-- ============================================================================
-- Create workspace and memberships
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    $$
        SELECT public.create_workspace(
            p_name => 'Message Command Workspace',
            p_slug => 'message-command-workspace',
            p_description => 'Workspace used by message command tests'
        )
    $$,
    'The owner can create the message-command test workspace'
);


RESET ROLE;


SELECT workspace_id
FROM public.workspaces
WHERE created_by =
    '80000000-0000-0000-0000-000000000001'::UUID
  AND workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_versions
      WHERE name = 'Message Command Workspace'
  )
\gset workspace_


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.add_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '80000000-0000-0000-0000-000000000002'::UUID
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
                    '80000000-0000-0000-0000-000000000003'::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can add the other active member'
);


-- ============================================================================
-- Create the primary channel
-- ============================================================================

SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => 'General',
                p_slug => 'general',
                p_description => 'General message discussion'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can create the primary message channel'
);


RESET ROLE;


SELECT channel_id
FROM public.channels
WHERE workspace_id = :'workspace_workspace_id'::UUID
  AND slug = 'general'
\gset channel_


-- ============================================================================
-- Active member creates a message
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_message(
                p_channel_id => %L::UUID,
                p_content => ' Initial message content '
            )
        $sql$,
        :'channel_channel_id'
    ),
    'An active workspace member can create a message'
);


RESET ROLE;


SELECT message_id
FROM public.messages
WHERE channel_id =
        :'channel_channel_id'::UUID
  AND author_user_id =
        '80000000-0000-0000-0000-000000000002'::UUID
ORDER BY created_at
LIMIT 1
\gset message_


-- ============================================================================
-- Initial aggregate state
-- ============================================================================

SELECT is(
    (
        SELECT count(*)
        FROM public.messages
        WHERE message_id =
                :'message_message_id'::UUID
          AND workspace_id =
                :'workspace_workspace_id'::UUID
          AND channel_id =
                :'channel_channel_id'::UUID
          AND author_user_id =
                '80000000-0000-0000-0000-000000000002'::UUID
    ),
    1::BIGINT,
    'Message creation inserts one stable identity'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
                :'message_message_id'::UUID
          AND version_number = 1
          AND content = 'Initial message content'
          AND created_by =
                '80000000-0000-0000-0000-000000000002'::UUID
    ),
    1::BIGINT,
    'Message creation inserts normalized immutable version 1'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.message_heads
        WHERE message_id =
                :'message_message_id'::UUID
          AND workspace_id =
                :'workspace_workspace_id'::UUID
          AND channel_id =
                :'channel_channel_id'::UUID
          AND latest_version_number = 1
          AND message_status = 'active'
          AND deleted_by IS NULL
          AND deleted_at IS NULL
    ),
    1::BIGINT,
    'Message creation initializes a consistent active head'
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
            1,
            'Initial message content'::TEXT,
            'active'::TEXT,
            FALSE
        )
    $$,
    'The current projection exposes the initial message state'
);


-- ============================================================================
-- Input validation
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.create_message(
                p_channel_id => %L::UUID,
                p_content => '   '
            )
        $sql$,
        :'channel_channel_id'
    ),
    '22023',
    NULL,
    'Blank message content is rejected'
);


RESET ROLE;


-- ============================================================================
-- Outsider creation denial
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000004';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.create_message(
                p_channel_id => %L::UUID,
                p_content => 'Unauthorized outsider message'
            )
        $sql$,
        :'channel_channel_id'
    ),
    '42501',
    NULL,
    'A workspace outsider cannot create a message'
);


RESET ROLE;


-- ============================================================================
-- Author-only editing
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.edit_message(
                p_message_id => %L::UUID,
                p_content => 'Owner attempted edit'
            )
        $sql$,
        :'message_message_id'
    ),
    '42501',
    NULL,
    'A workspace owner cannot edit another user''s message'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000003';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.edit_message(
                p_message_id => %L::UUID,
                p_content => 'Other member attempted edit'
            )
        $sql$,
        :'message_message_id'
    ),
    '42501',
    NULL,
    'An ordinary non-author member cannot edit a message'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.edit_message(
                p_message_id => %L::UUID,
                p_content => ' Updated message content '
            )
        $sql$,
        :'message_message_id'
    ),
    'The original author can edit an active message'
);


RESET ROLE;


-- ============================================================================
-- Immutable edit history
-- ============================================================================

SELECT is(
    (
        SELECT count(*)
        FROM public.message_versions
        WHERE message_id =
            :'message_message_id'::UUID
    ),
    2::BIGINT,
    'Editing appends a second immutable version'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                latest_version_number,
                message_status
            FROM public.message_heads
            WHERE message_id = %L::UUID
        $sql$,
        :'message_message_id'
    ),
    $$
        VALUES (
            2,
            'active'::TEXT
        )
    $$,
    'The message head advances to version 2'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                content,
                is_edited
            FROM public.current_messages
            WHERE message_id = %L::UUID
        $sql$,
        :'message_message_id'
    ),
    $$
        VALUES (
            2,
            'Updated message content'::TEXT,
            TRUE
        )
    $$,
    'The current projection exposes the edited message'
);


SELECT results_eq(
    format(
        $sql$
            SELECT
                version_number,
                content
            FROM public.message_versions
            WHERE message_id = %L::UUID
              AND version_number = 1
        $sql$,
        :'message_message_id'
    ),
    $$
        VALUES (
            1,
            'Initial message content'::TEXT
        )
    $$,
    'Editing leaves immutable version 1 unchanged'
);


-- ============================================================================
-- No-op edit rejection
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.edit_message(
                p_message_id => %L::UUID,
                p_content => ' Updated message content '
            )
        $sql$,
        :'message_message_id'
    ),
    '22023',
    NULL,
    'An edit identical to the normalized current content is rejected'
);


RESET ROLE;


-- ============================================================================
-- Delete authorization
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000003';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.delete_message(
                p_message_id => %L::UUID
            )
        $sql$,
        :'message_message_id'
    ),
    '42501',
    NULL,
    'An ordinary non-author member cannot delete a message'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.delete_message(
                p_message_id => %L::UUID
            )
        $sql$,
        :'message_message_id'
    ),
    'The original author can delete an active message'
);


RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.message_heads
        WHERE message_id =
                :'message_message_id'::UUID
          AND message_status = 'deleted'
          AND deleted_by =
                '80000000-0000-0000-0000-000000000002'::UUID
          AND deleted_at IS NOT NULL
    ),
    1::BIGINT,
    'Author deletion records the deleted state and actor'
);


-- ============================================================================
-- Deleted-message mutation rejection
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.delete_message(
                p_message_id => %L::UUID
            )
        $sql$,
        :'message_message_id'
    ),
    '55000',
    NULL,
    'A deleted message cannot be deleted again'
);


SELECT throws_ok(
    format(
        $sql$
            SELECT public.edit_message(
                p_message_id => %L::UUID,
                p_content => 'Attempted post-deletion edit'
            )
        $sql$,
        :'message_message_id'
    ),
    '55000',
    NULL,
    'A deleted message cannot be edited'
);


RESET ROLE;


-- ============================================================================
-- Owner moderation
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000003';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_message(
                p_channel_id => %L::UUID,
                p_content => 'Message requiring owner moderation'
            )
        $sql$,
        :'channel_channel_id'
    ),
    'The other active member can create a moderation target'
);


RESET ROLE;


SELECT message_id
FROM public.messages
WHERE channel_id =
        :'channel_channel_id'::UUID
  AND author_user_id =
        '80000000-0000-0000-0000-000000000003'::UUID
ORDER BY created_at DESC
LIMIT 1
\gset moderation_message_


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.delete_message(
                p_message_id => %L::UUID
            )
        $sql$,
        :'moderation_message_message_id'
    ),
    'An active workspace owner can moderate another user''s message'
);


RESET ROLE;


SELECT is(
    (
        SELECT deleted_by
        FROM public.message_heads
        WHERE message_id =
            :'moderation_message_message_id'::UUID
    ),
    '80000000-0000-0000-0000-000000000001'::UUID,
    'Owner moderation records the owner as the deleting actor'
);


-- ============================================================================
-- Removed-author authorization loss
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_message(
                p_channel_id => %L::UUID,
                p_content => 'Message created before membership removal'
            )
        $sql$,
        :'channel_channel_id'
    ),
    'The author can create a message before removal'
);


RESET ROLE;


SELECT message_id
FROM public.messages
WHERE channel_id =
        :'channel_channel_id'::UUID
  AND author_user_id =
        '80000000-0000-0000-0000-000000000002'::UUID
  AND message_id <>
        :'message_message_id'::UUID
ORDER BY created_at DESC
LIMIT 1
\gset removed_author_message_


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.remove_workspace_member(
                p_workspace_id => %L::UUID,
                p_user_id =>
                    '80000000-0000-0000-0000-000000000002'::UUID,
                p_reason =>
                    'Testing message authorization after removal'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can remove the message author'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000002';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.delete_message(
                p_message_id => %L::UUID
            )
        $sql$,
        :'removed_author_message_message_id'
    ),
    '42501',
    NULL,
    'A removed author cannot delete a previously authored message'
);


SELECT throws_ok(
    format(
        $sql$
            SELECT public.create_message(
                p_channel_id => %L::UUID,
                p_content => 'Message attempted after removal'
            )
        $sql$,
        :'channel_channel_id'
    ),
    '42501',
    NULL,
    'A removed workspace member cannot create new messages'
);


RESET ROLE;


-- ============================================================================
-- Archived-channel rejection
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.create_channel(
                p_workspace_id => %L::UUID,
                p_name => 'Archived Message Channel',
                p_slug => 'archived-message-channel',
                p_description =>
                    'Channel archived before message creation'
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can create the archived-channel test fixture'
);


RESET ROLE;


SELECT channel_id
FROM public.channels
WHERE workspace_id =
        :'workspace_workspace_id'::UUID
  AND slug = 'archived-message-channel'
\gset archived_channel_


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.archive_channel(
                p_channel_id => %L::UUID
            )
        $sql$,
        :'archived_channel_channel_id'
    ),
    'The owner can archive the channel fixture'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000003';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.create_message(
                p_channel_id => %L::UUID,
                p_content => 'Message attempted in archived channel'
            )
        $sql$,
        :'archived_channel_channel_id'
    ),
    '55000',
    NULL,
    'A message cannot be created in an archived channel'
);


RESET ROLE;


-- ============================================================================
-- Archived-workspace rejection
-- ============================================================================

SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    format(
        $sql$
            SELECT public.archive_workspace(
                p_workspace_id => %L::UUID
            )
        $sql$,
        :'workspace_workspace_id'
    ),
    'The owner can archive the workspace fixture'
);


RESET ROLE;


SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '80000000-0000-0000-0000-000000000003';


SELECT throws_ok(
    format(
        $sql$
            SELECT public.create_message(
                p_channel_id => %L::UUID,
                p_content => 'Message attempted in archived workspace'
            )
        $sql$,
        :'channel_channel_id'
    ),
    '55000',
    NULL,
    'A message cannot be created in an archived workspace'
);


RESET ROLE;


-- ============================================================================
-- Immutable-row enforcement
-- ============================================================================

SELECT throws_ok(
    format(
        $sql$
            UPDATE public.messages
            SET author_user_id =
                '80000000-0000-0000-0000-000000000001'::UUID
            WHERE message_id = %L::UUID
        $sql$,
        :'message_message_id'
    ),
    '55000',
    NULL,
    'Stable message identities cannot be updated'
);


SELECT throws_ok(
    format(
        $sql$
            UPDATE public.message_versions
            SET content = 'Mutated immutable content'
            WHERE message_id = %L::UUID
              AND version_number = 1
        $sql$,
        :'message_message_id'
    ),
    '55000',
    NULL,
    'Immutable message versions cannot be updated'
);


-- ============================================================================
-- Direct application-role write protection
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
    'Authenticated users cannot update message versions directly'
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