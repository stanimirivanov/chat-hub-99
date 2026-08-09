BEGIN;

SELECT plan(10);

SELECT is(
    (
        SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname IN (
              'workspace_unread_broadcast_select',
              'profile_unread_broadcast_select'
          )
          AND cmd = 'SELECT'
          AND roles = ARRAY['authenticated']::NAME[]
    ),
    2::BIGINT,
    'Authenticated users have workspace and profile unread broadcast policies'
);

SELECT ok(
    (
        SELECT qual LIKE '%can_receive_workspace_unread_broadcast%'
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'workspace_unread_broadcast_select'
    ),
    'Workspace unread topics use active-membership authorization'
);

SELECT ok(
    (
        SELECT qual LIKE '%profile-unread:%' AND qual LIKE '%auth.uid()%'
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'profile_unread_broadcast_select'
    ),
    'Profile unread topics are restricted to the authenticated user'
);

SELECT is(
    private.can_receive_workspace_unread_broadcast(
        (
            SELECT 'workspace-unread:' || workspace_id::TEXT
            FROM public.workspace_heads
            WHERE workspace_status = 'active'
            LIMIT 1
        ),
        '10000000-0000-4000-8000-000000000001'::UUID
    ),
    TRUE,
    'An active workspace owner may receive its unread topic'
);

SELECT is(
    private.can_receive_workspace_unread_broadcast(
        (
            SELECT 'workspace-unread:' || workspace_id::TEXT
            FROM public.workspace_heads
            WHERE workspace_status = 'active'
            LIMIT 1
        ),
        '10000000-0000-4000-8000-000000000003'::UUID
    ),
    FALSE,
    'A workspace outsider may not receive its unread topic'
);

SELECT is(
    (
        SELECT count(*)
        FROM pg_trigger
        INNER JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid
        INNER JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_trigger.tgname IN (
              'message_heads_broadcast_workspace_unread_change',
              'channel_heads_broadcast_workspace_unread_change',
              'channel_read_positions_broadcast_profile_unread_change'
          )
          AND NOT pg_trigger.tgisinternal
    ),
    3::BIGINT,
    'Message, channel, and read-position changes invalidate unread snapshots'
);

SELECT is(
    (
        SELECT count(*)
        FROM pg_proc
        INNER JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'private'
          AND pg_proc.proname IN (
              'broadcast_workspace_unread_change',
              'broadcast_profile_unread_change'
          )
          AND pg_proc.prosecdef
    ),
    2::BIGINT,
    'Unread trigger functions can publish through the protected Realtime schema'
);

SELECT ok(
    EXISTS (
        SELECT 1
        FROM realtime.messages
        WHERE topic LIKE 'workspace-unread:%'
          AND event = 'changed'
          AND private
          AND payload ? 'workspace_id'
    ),
    'Seeded message or channel heads produce workspace unread invalidations'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1
        FROM realtime.messages
        WHERE topic LIKE 'workspace-unread:%'
          AND payload ? 'message_id'
    ),
    'Workspace unread invalidations do not expose message identities'
);

SELECT ok(
    NOT EXISTS (
        SELECT 1
        FROM realtime.messages
        WHERE topic LIKE 'workspace-unread:%'
          AND payload ? 'user_id'
    ),
    'Workspace unread invalidations do not expose member identities'
);

SELECT *
FROM finish();

ROLLBACK;
