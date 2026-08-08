BEGIN;

SELECT plan(7);

SELECT is(
    (
        SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'workspace_channel_broadcast_select'
          AND cmd = 'SELECT'
          AND roles = ARRAY['authenticated']::NAME[]
    ),
    1::BIGINT,
    'Authenticated users have one workspace-channel broadcast read policy'
);

SELECT ok(
    (
        SELECT
            qual LIKE '%can_receive_workspace_channel_broadcast%'
            AND qual LIKE '%auth.uid()%'
            AND qual LIKE '%broadcast%'
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'workspace_channel_broadcast_select'
    ),
    'Workspace-channel broadcast authorization uses authenticated membership'
);

SELECT is(
    private.can_receive_workspace_channel_broadcast(
        (
            SELECT 'workspace-channels:' || workspace_id::TEXT
            FROM public.workspace_heads
            WHERE workspace_status = 'active'
            LIMIT 1
        ),
        '10000000-0000-4000-8000-000000000001'::UUID
    ),
    TRUE,
    'An active workspace owner may receive the workspace channel topic'
);

SELECT is(
    private.can_receive_workspace_channel_broadcast(
        (
            SELECT 'workspace-channels:' || workspace_id::TEXT
            FROM public.workspace_heads
            WHERE workspace_status = 'active'
            LIMIT 1
        ),
        '10000000-0000-4000-8000-000000000003'::UUID
    ),
    FALSE,
    'A workspace outsider may not receive the workspace channel topic'
);

SELECT is(
    (
        SELECT count(*)
        FROM pg_trigger
        INNER JOIN pg_class
            ON pg_class.oid = pg_trigger.tgrelid
        INNER JOIN pg_namespace
            ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_class.relname = 'channel_heads'
          AND pg_trigger.tgname =
                'channel_heads_broadcast_workspace_change'
          AND NOT pg_trigger.tgisinternal
    ),
    1::BIGINT,
    'Channel heads broadcast workspace-navigation changes'
);

SELECT is(
    (
        SELECT prosecdef
        FROM pg_proc
        INNER JOIN pg_namespace
            ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'private'
          AND pg_proc.proname = 'broadcast_workspace_channel_change'
    ),
    TRUE,
    'The channel trigger function can publish through the Realtime schema'
);

SELECT ok(
    EXISTS (
        SELECT 1
        FROM realtime.messages
        WHERE topic LIKE 'workspace-channels:%'
          AND event = 'changed'
          AND private
          AND payload ? 'channel_id'
    ),
    'Seeded channel heads produce private payload-minimal invalidations'
);

SELECT *
FROM finish();

ROLLBACK;
