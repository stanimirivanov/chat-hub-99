-- Per-member channel read-position and unread-count tests.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(13);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
(
    '97000000-0000-4000-8000-000000000001',
    'read-owner@example.com',
    '{"username":"read-owner","display_name":"Read Owner"}'::jsonb
),
(
    '97000000-0000-4000-8000-000000000002',
    'read-member@example.com',
    '{"username":"read-member","display_name":"Read Member"}'::jsonb
),
(
    '97000000-0000-4000-8000-000000000003',
    'read-outsider@example.com',
    '{"username":"read-outsider","display_name":"Read Outsider"}'::jsonb
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '97000000-0000-4000-8000-000000000001';

SELECT public.create_workspace(
    p_name => 'Read Workspace',
    p_slug => 'read-workspace'
);

SELECT workspace_id AS id
FROM public.current_workspaces
WHERE slug = 'read-workspace'
\gset workspace_

SELECT public.create_channel(
    p_workspace_id => :'workspace_id'::uuid,
    p_name => 'General',
    p_slug => 'general'
) AS id
\gset general_channel_

SELECT public.create_channel(
    p_workspace_id => :'workspace_id'::uuid,
    p_name => 'Empty',
    p_slug => 'empty'
) AS id
\gset empty_channel_

SELECT public.add_workspace_member(
    p_workspace_id => :'workspace_id'::uuid,
    p_user_id => '97000000-0000-4000-8000-000000000002'::uuid
);

SELECT public.create_message(
    p_channel_id => :'general_channel_id'::uuid,
    p_content => 'first unread message'
) AS id
\gset first_message_

SELECT public.create_message(
    p_channel_id => :'general_channel_id'::uuid,
    p_content => 'second unread message'
) AS id
\gset second_message_

SELECT ok(
    has_function_privilege(
        'authenticated',
        'public.mark_channel_read(uuid,uuid)',
        'EXECUTE'
    ),
    'Authenticated users can execute the mark-read command'
);

SELECT ok(
    has_function_privilege(
        'authenticated',
        'public.list_workspace_channel_unread_counts(uuid)',
        'EXECUTE'
    ),
    'Authenticated users can execute the unread-count query'
);

SET LOCAL request.jwt.claim.sub =
    '97000000-0000-4000-8000-000000000002';

SELECT is(
    (
        SELECT unread_count
        FROM public.list_workspace_channel_unread_counts(
            :'workspace_id'::uuid
        )
        WHERE channel_id = :'general_channel_id'::uuid
    ),
    2::bigint,
    'A member without a read position sees all active messages as unread'
);

SELECT is(
    (
        SELECT unread_count
        FROM public.list_workspace_channel_unread_counts(
            :'workspace_id'::uuid
        )
        WHERE channel_id = :'empty_channel_id'::uuid
    ),
    0::bigint,
    'The snapshot includes empty active channels with a zero count'
);

SELECT is(
    public.mark_channel_read(
        :'general_channel_id'::uuid,
        :'second_message_id'::uuid
    ),
    :'second_message_id'::uuid,
    'Marking a channel read records its newest message identity'
);

SELECT is(
    (
        SELECT unread_count
        FROM public.list_workspace_channel_unread_counts(
            :'workspace_id'::uuid
        )
        WHERE channel_id = :'general_channel_id'::uuid
    ),
    0::bigint,
    'Marking a channel read clears its unread count'
);

SET LOCAL request.jwt.claim.sub =
    '97000000-0000-4000-8000-000000000001';

SELECT public.create_message(
    p_channel_id => :'general_channel_id'::uuid,
    p_content => 'new message after the member read the channel'
) AS id
\gset third_message_

SET LOCAL request.jwt.claim.sub =
    '97000000-0000-4000-8000-000000000002';

SELECT is(
    (
        SELECT unread_count
        FROM public.list_workspace_channel_unread_counts(
            :'workspace_id'::uuid
        )
        WHERE channel_id = :'general_channel_id'::uuid
    ),
    1::bigint,
    'Messages created after the persisted position are unread'
);

SELECT public.mark_channel_read(
    :'general_channel_id'::uuid,
    :'third_message_id'::uuid
);

SET LOCAL ROLE postgres;

SELECT is(
    (
        SELECT last_read_message_id
        FROM public.channel_read_positions
        WHERE channel_id = :'general_channel_id'::uuid
          AND user_id =
              '97000000-0000-4000-8000-000000000002'::uuid
    ),
    :'third_message_id'::uuid,
    'A later mark-read command advances the persisted position'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '97000000-0000-4000-8000-000000000002';

SELECT public.mark_channel_read(
    :'general_channel_id'::uuid,
    :'second_message_id'::uuid
);

SET LOCAL ROLE postgres;

SELECT is(
    (
        SELECT last_read_message_id
        FROM public.channel_read_positions
        WHERE channel_id = :'general_channel_id'::uuid
          AND user_id =
              '97000000-0000-4000-8000-000000000002'::uuid
    ),
    :'third_message_id'::uuid,
    'A stale command cannot move the persisted position backwards'
);

SELECT is(
    (
        SELECT count(*)::integer
        FROM public.channel_read_positions
        WHERE channel_id = :'empty_channel_id'::uuid
    ),
    0,
    'Empty channels do not persist a meaningless read-position row'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '97000000-0000-4000-8000-000000000002';

SELECT throws_ok(
    format(
        'SELECT public.mark_channel_read(%L::uuid, %L::uuid)',
        :'empty_channel_id',
        :'third_message_id'
    ),
    '22023',
    'Read target does not belong to the selected channel',
    'A read position cannot use a message from another channel'
);

SET LOCAL request.jwt.claim.sub =
    '97000000-0000-4000-8000-000000000003';

SELECT throws_ok(
    format(
        'SELECT public.list_workspace_channel_unread_counts(%L::uuid)',
        :'workspace_id'
    ),
    '42501',
    'Only active workspace members may list channel unread counts',
    'Outsiders cannot list unread counts'
);

SELECT throws_ok(
    format(
        'SELECT public.mark_channel_read(%L::uuid, %L::uuid)',
        :'general_channel_id',
        :'third_message_id'
    ),
    '42501',
    'Only active workspace members may mark an active channel as read',
    'Outsiders cannot create read positions'
);

SELECT * FROM finish();

ROLLBACK;
