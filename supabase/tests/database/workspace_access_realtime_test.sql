BEGIN;

SELECT plan(5);

SELECT is(
    (
        SELECT count(*)
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'workspace_access_broadcast_select'
          AND cmd = 'SELECT'
          AND roles = ARRAY['authenticated']::NAME[]
    ),
    1::BIGINT,
    'Authenticated users have one workspace-access broadcast read policy'
);

SELECT ok(
    (
        SELECT
            qual LIKE '%workspace-access:%'
            AND qual LIKE '%auth.uid()%'
            AND qual LIKE '%broadcast%'
        FROM pg_policies
        WHERE schemaname = 'realtime'
          AND tablename = 'messages'
          AND policyname = 'workspace_access_broadcast_select'
    ),
    'Workspace-access broadcast authorization is scoped to the authenticated user topic'
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
          AND pg_class.relname = 'workspace_membership_heads'
          AND pg_trigger.tgname =
                'workspace_membership_heads_broadcast_access_change'
          AND NOT pg_trigger.tgisinternal
    ),
    1::BIGINT,
    'Workspace membership heads broadcast access changes'
);

SELECT is(
    (
        SELECT prosecdef
        FROM pg_proc
        INNER JOIN pg_namespace
            ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'private'
          AND pg_proc.proname = 'broadcast_workspace_access_change'
    ),
    TRUE,
    'The workspace-access trigger function can publish through the protected Realtime schema'
);

SELECT ok(
    EXISTS (
        SELECT 1
        FROM realtime.messages
        WHERE topic LIKE 'workspace-access:%'
          AND event = 'changed'
          AND private
          AND payload ? 'workspace_id'
    ),
    'Seeded membership heads produce private payload-minimal access invalidations'
);

SELECT *
FROM finish();

ROLLBACK;
