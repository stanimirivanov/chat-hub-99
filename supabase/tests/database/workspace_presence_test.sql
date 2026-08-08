BEGIN;

SELECT plan(6);

SELECT is(
    (
        SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'workspace_presence_select'
          AND cmd = 'SELECT'
          AND roles = ARRAY['authenticated']::NAME[]
    ),
    1::BIGINT,
    'Authenticated users have one workspace-presence read policy'
);

SELECT is(
    (
        SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'workspace_presence_insert'
          AND cmd = 'INSERT'
          AND roles = ARRAY['authenticated']::NAME[]
    ),
    1::BIGINT,
    'Authenticated users have one workspace-presence write policy'
);

SELECT ok(
    (
        SELECT
            qual LIKE '%can_access_workspace_presence%'
            AND qual LIKE '%auth.uid()%'
            AND qual LIKE '%presence%'
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'workspace_presence_select'
    ),
    'Presence reads require authenticated active workspace membership'
);

SELECT ok(
    (
        SELECT
            with_check LIKE '%can_access_workspace_presence%'
            AND with_check LIKE '%auth.uid()%'
            AND with_check LIKE '%presence%'
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'workspace_presence_insert'
    ),
    'Presence tracking requires authenticated active workspace membership'
);

SELECT is(
    private.can_access_workspace_presence(
        (
            SELECT 'workspace-presence:' || workspace_id::TEXT
            FROM public.workspace_heads
            WHERE workspace_status = 'active'
            LIMIT 1
        ),
        '10000000-0000-4000-8000-000000000001'::UUID
    ),
    TRUE,
    'An active workspace owner may access the private presence topic'
);

SELECT is(
    private.can_access_workspace_presence(
        (
            SELECT 'workspace-presence:' || workspace_id::TEXT
            FROM public.workspace_heads
            WHERE workspace_status = 'active'
            LIMIT 1
        ),
        '10000000-0000-4000-8000-000000000003'::UUID
    ),
    FALSE,
    'A workspace outsider may not access the private presence topic'
);

SELECT *
FROM finish();

ROLLBACK;
