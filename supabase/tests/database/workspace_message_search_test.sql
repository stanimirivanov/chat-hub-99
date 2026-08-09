-- Workspace-message search authorization and ranking tests.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(8);

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
(
    '96000000-0000-0000-0000-000000000001',
    'search-owner@example.com',
    '{"username":"search-owner","display_name":"Search Owner"}'::jsonb
),
(
    '96000000-0000-0000-0000-000000000002',
    'search-member@example.com',
    '{"username":"search-member","display_name":"Search Member"}'::jsonb
),
(
    '96000000-0000-0000-0000-000000000003',
    'search-outsider@example.com',
    '{"username":"search-outsider","display_name":"Search Outsider"}'::jsonb
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub =
    '96000000-0000-0000-0000-000000000001';

SELECT public.create_workspace(
    p_name => 'Search Workspace',
    p_slug => 'search-workspace'
);

SELECT workspace_id AS id
FROM public.current_workspaces
WHERE slug = 'search-workspace'
\gset workspace_

SELECT public.create_channel(
    p_workspace_id => :'workspace_id'::uuid,
    p_name => 'Planning',
    p_slug => 'planning'
) AS id
\gset channel_

SELECT public.add_workspace_member(
    p_workspace_id => :'workspace_id'::uuid,
    p_user_id => '96000000-0000-0000-0000-000000000002'::uuid
);

SET LOCAL request.jwt.claim.sub =
    '96000000-0000-0000-0000-000000000002';

SELECT public.create_message(
    p_channel_id => :'channel_id'::uuid,
    p_content => 'alpha project decision'
) AS id
\gset first_message_

SELECT public.create_message(
    p_channel_id => :'channel_id'::uuid,
    p_content => 'alpha alpha decision record'
) AS id
\gset ranked_message_

SELECT public.create_message(
    p_channel_id => :'channel_id'::uuid,
    p_content => 'unrelated conversation'
);

SELECT has_function_privilege(
    'authenticated',
    'public.search_workspace_messages(uuid,text,integer)',
    'EXECUTE'
), 'Authenticated users can execute workspace message search';

SELECT is(
    (
        SELECT count(*)::integer
        FROM public.search_workspace_messages(
            :'workspace_id'::uuid,
            'alpha',
            20
        )
    ),
    2,
    'Search returns only matching current messages'
);

SELECT is(
    (
        SELECT message_id
        FROM public.search_workspace_messages(
            :'workspace_id'::uuid,
            'alpha',
            20
        )
        LIMIT 1
    ),
    :'ranked_message_id'::uuid,
    'Higher full-text relevance is ordered first'
);

SELECT results_eq(
    format(
        $sql$
            SELECT channel_name, channel_slug
            FROM public.search_workspace_messages(%L::uuid, 'alpha', 1)
        $sql$,
        :'workspace_id'
    ),
    $$ VALUES ('Planning'::text, 'planning'::text) $$,
    'Search results carry their active-channel navigation target'
);

SELECT is(
    (
        SELECT count(*)::integer
        FROM public.search_workspace_messages(
            :'workspace_id'::uuid,
            '   ',
            20
        )
    ),
    0,
    'Blank search text returns no rows'
);

SET LOCAL request.jwt.claim.sub =
    '96000000-0000-0000-0000-000000000003';

SELECT is(
    (
        SELECT count(*)::integer
        FROM public.search_workspace_messages(
            :'workspace_id'::uuid,
            'alpha',
            20
        )
    ),
    0,
    'RLS hides all workspace search results from outsiders'
);

SET LOCAL request.jwt.claim.sub =
    '96000000-0000-0000-0000-000000000002';

SELECT public.delete_message(:'first_message_id'::uuid);

SELECT is(
    (
        SELECT count(*)::integer
        FROM public.search_workspace_messages(
            :'workspace_id'::uuid,
            'alpha',
            20
        )
    ),
    1,
    'Soft-deleted messages are excluded from search'
);

SET LOCAL request.jwt.claim.sub =
    '96000000-0000-0000-0000-000000000001';

SELECT public.archive_channel(:'channel_id'::uuid);

SELECT is(
    (
        SELECT count(*)::integer
        FROM public.search_workspace_messages(
            :'workspace_id'::uuid,
            'alpha',
            20
        )
    ),
    0,
    'Archived channels are excluded from active navigation search'
);

SELECT * FROM finish();

ROLLBACK;
