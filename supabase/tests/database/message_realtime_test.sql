BEGIN;

SELECT plan(2);

SELECT is(
    (
        SELECT count(*)
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'message_heads'
    ),
    1::BIGINT,
    'Message heads are published for Supabase Realtime'
);

SELECT is(
    (
        SELECT relrowsecurity
        FROM pg_class
        INNER JOIN pg_namespace
            ON pg_namespace.oid = pg_class.relnamespace
        WHERE pg_namespace.nspname = 'public'
          AND pg_class.relname = 'message_heads'
    ),
    TRUE,
    'Realtime message-head delivery remains protected by RLS'
);

SELECT *
FROM finish();

ROLLBACK;
