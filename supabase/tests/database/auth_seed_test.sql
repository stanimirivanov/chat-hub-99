BEGIN;

SELECT plan(4);

-- ============================================================================
-- Seeded development users
-- ============================================================================

SELECT is(
    (
        SELECT count(*)::INTEGER
        FROM auth.users
        WHERE email IN (
            'owner@chat-hub.local',
            'member@chat-hub.local',
            'outsider@chat-hub.local'
        )
    ),
    3,
    'all three local development users are seeded'
);

SELECT is(
    (
        SELECT count(*)::INTEGER
        FROM auth.users
        WHERE email IN (
            'owner@chat-hub.local',
            'member@chat-hub.local',
            'outsider@chat-hub.local'
        )
          AND (
              confirmation_token IS NULL
              OR recovery_token IS NULL
              OR email_change_token_new IS NULL
              OR email_change IS NULL
              OR phone_change IS NULL
              OR phone_change_token IS NULL
              OR reauthentication_token IS NULL
          )
    ),
    0,
    'seeded users contain no null Auth token strings'
);

SELECT is(
    (
        SELECT count(*)::INTEGER
        FROM auth.users
        WHERE email IN (
            'owner@chat-hub.local',
            'member@chat-hub.local',
            'outsider@chat-hub.local'
        )
          AND email_confirmed_at IS NOT NULL
    ),
    3,
    'all seeded development users have confirmed email addresses'
);

SELECT is(
    (
        SELECT count(*)::INTEGER
        FROM auth.users
        WHERE email IN (
            'owner@chat-hub.local',
            'member@chat-hub.local',
            'outsider@chat-hub.local'
        )
          AND encrypted_password IS NOT NULL
          AND encrypted_password <> ''
    ),
    3,
    'all seeded development users have encrypted passwords'
);

SELECT * FROM finish();

ROLLBACK;