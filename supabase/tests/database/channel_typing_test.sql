BEGIN;

SELECT plan(6);

SELECT is(
    (SELECT count(*) FROM pg_policies
     WHERE schemaname = 'realtime' AND tablename = 'messages'
       AND policyname = 'channel_typing_select' AND cmd = 'SELECT'
       AND roles = ARRAY['authenticated']::NAME[]),
    1::BIGINT,
    'Channel typing has one authenticated read policy'
);

SELECT is(
    (SELECT count(*) FROM pg_policies
     WHERE schemaname = 'realtime' AND tablename = 'messages'
       AND policyname = 'channel_typing_insert' AND cmd = 'INSERT'
       AND roles = ARRAY['authenticated']::NAME[]),
    1::BIGINT,
    'Channel typing has one authenticated write policy'
);

SELECT ok(
    (SELECT qual LIKE '%can_access_channel_typing%'
            AND qual LIKE '%broadcast%'
     FROM pg_policies WHERE policyname = 'channel_typing_select'),
    'Typing reads use active channel membership authorization'
);

SELECT ok(
    (SELECT with_check LIKE '%can_access_channel_typing%'
            AND with_check LIKE '%broadcast%'
     FROM pg_policies WHERE policyname = 'channel_typing_insert'),
    'Typing writes use active channel membership authorization'
);

SELECT is(
    private.can_access_channel_typing(
        (SELECT 'channel-typing:' || channel_id::TEXT
         FROM public.channel_heads WHERE channel_status = 'active' LIMIT 1),
        '10000000-0000-4000-8000-000000000001'::UUID
    ),
    TRUE,
    'An active workspace owner may access an active channel typing topic'
);

SELECT is(
    private.can_access_channel_typing(
        (SELECT 'channel-typing:' || channel_id::TEXT
         FROM public.channel_heads WHERE channel_status = 'active' LIMIT 1),
        '10000000-0000-4000-8000-000000000003'::UUID
    ),
    FALSE,
    'A workspace outsider may not access a channel typing topic'
);

SELECT * FROM finish();

ROLLBACK;
