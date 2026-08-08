BEGIN;

SELECT plan(5);

-- ============================================================================
-- Seeded development users
-- ============================================================================

SELECT is(
    (
        SELECT count(*)::INTEGER
        FROM auth.users
        WHERE email IN (
            'owner@omoikane.local',
            'member@omoikane.local',
            'outsider@omoikane.local'
        )
    ),
    3,
    'all three local development users are seeded'
);

SELECT results_eq(
    $$
        SELECT id, email
        FROM auth.users
        WHERE email LIKE '%@omoikane.local'
        ORDER BY id
    $$,
    $$
        VALUES
            (
                '10000000-0000-4000-8000-000000000001'::UUID,
                'owner@omoikane.local'::VARCHAR
            ),
            (
                '10000000-0000-4000-8000-000000000002'::UUID,
                'member@omoikane.local'::VARCHAR
            ),
            (
                '10000000-0000-4000-8000-000000000003'::UUID,
                'outsider@omoikane.local'::VARCHAR
            )
    $$,
    'seeded email addresses map to stable user identifiers'
);

SELECT is(
    (
        SELECT count(*)::INTEGER
        FROM auth.users
        WHERE email IN (
            'owner@omoikane.local',
            'member@omoikane.local',
            'outsider@omoikane.local'
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
            'owner@omoikane.local',
            'member@omoikane.local',
            'outsider@omoikane.local'
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
            'owner@omoikane.local',
            'member@omoikane.local',
            'outsider@omoikane.local'
        )
          AND encrypted_password IS NOT NULL
          AND encrypted_password <> ''
          AND encrypted_password = crypt(
              'Password123!',
              encrypted_password
          )
    ),
    3,
    'all seeded development users accept the documented local password'
);

SELECT * FROM finish();

ROLLBACK;
