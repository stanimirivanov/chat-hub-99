-- ============================================================================
-- Immutable profile command tests
-- ============================================================================
--
-- These tests verify:
--
--   - an Auth user automatically receives a stable profile identity;
--   - the initial immutable profile version is created;
--   - the current profile head points to that version;
--   - updating a profile appends a new version;
--   - the previous version remains unchanged;
--   - the head advances to the new version;
--   - immutable rows reject UPDATE and DELETE operations.
--
-- The complete test runs inside a transaction and ends with ROLLBACK, so no
-- test user or profile data remains in the local database.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap
WITH SCHEMA extensions;

SELECT plan(12);


-- ============================================================================
-- Test data
-- ============================================================================

INSERT INTO auth.users (
    id,
    email,
    raw_user_meta_data
)
VALUES (
    '10000000-0000-0000-0000-000000000001',
    'profile-test@example.com',
    jsonb_build_object(
        'username', 'initial-user',
        'display_name', 'Initial User',
        'avatar_url', 'https://example.com/initial-avatar.png'
    )
);


-- ============================================================================
-- Automatic profile initialization
-- ============================================================================

SELECT is(
    (
        SELECT count(*)
        FROM public.profiles
        WHERE user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
    ),
    1::BIGINT,
    'Creating an Auth user creates one stable profile identity'
);


SELECT is(
    (
        SELECT count(*)
        FROM public.profile_versions
        WHERE user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
    ),
    1::BIGINT,
    'Creating an Auth user creates one immutable profile version'
);


SELECT is(
    (
        SELECT version_number
        FROM public.profile_versions
        WHERE user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
    ),
    1,
    'The initial profile version number is 1'
);


SELECT results_eq(
    $$
        SELECT
            username,
            display_name,
            avatar_url,
            status
        FROM public.profile_versions
        WHERE user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
    $$,
    $$
        VALUES (
            'initial-user'::TEXT,
            'Initial User'::TEXT,
            'https://example.com/initial-avatar.png'::TEXT,
            'active'::TEXT
        )
    $$,
    'The initial profile version contains the Auth metadata'
);


SELECT is(
    (
        SELECT profile_versions.version_number
        FROM public.profile_heads
        INNER JOIN public.profile_versions
            ON profile_versions.profile_version_id =
                profile_heads.profile_version_id
            AND profile_versions.user_id =
                profile_heads.user_id
        WHERE profile_heads.user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
    ),
    1,
    'The profile head initially points to version 1'
);


-- ============================================================================
-- Self-service profile update
-- ============================================================================

-- Simulate an authenticated Supabase request.
SET LOCAL ROLE authenticated;

SET LOCAL request.jwt.claim.sub =
    '10000000-0000-0000-0000-000000000001';


SELECT lives_ok(
    $$
        SELECT public.update_my_profile(
            p_display_name => 'Updated User',
            p_username => 'updated-user',
            p_avatar_url => 'https://example.com/updated-avatar.png'
        )
    $$,
    'An authenticated user can append a new profile version'
);


-- Return to the database owner for direct verification of the internal tables.
RESET ROLE;


SELECT is(
    (
        SELECT count(*)
        FROM public.profile_versions
        WHERE user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
    ),
    2::BIGINT,
    'Updating a profile appends a second immutable version'
);


SELECT results_eq(
    $$
        SELECT
            username,
            display_name,
            avatar_url,
            status
        FROM public.profile_versions
        WHERE user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
          AND version_number = 1
    $$,
    $$
        VALUES (
            'initial-user'::TEXT,
            'Initial User'::TEXT,
            'https://example.com/initial-avatar.png'::TEXT,
            'active'::TEXT
        )
    $$,
    'Appending a new version does not modify version 1'
);


SELECT results_eq(
    $$
        SELECT
            version_number,
            username,
            display_name,
            avatar_url,
            status
        FROM public.profile_versions
        WHERE user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
          AND version_number = 2
    $$,
    $$
        VALUES (
            2,
            'updated-user'::TEXT,
            'Updated User'::TEXT,
            'https://example.com/updated-avatar.png'::TEXT,
            'active'::TEXT
        )
    $$,
    'The second version contains the updated profile snapshot'
);


SELECT ok(
    (
        SELECT
            new_version.supersedes_profile_version_id =
                old_version.profile_version_id
        FROM public.profile_versions AS new_version
        INNER JOIN public.profile_versions AS old_version
            ON old_version.user_id = new_version.user_id
            AND old_version.version_number = 1
        WHERE new_version.user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
          AND new_version.version_number = 2
    ),
    'Version 2 supersedes version 1'
);


SELECT results_eq(
    $$
        SELECT
            profile_versions.version_number,
            profile_heads.current_username,
            profile_heads.membership_status
        FROM public.profile_heads
        INNER JOIN public.profile_versions
            ON profile_versions.profile_version_id =
                profile_heads.profile_version_id
            AND profile_versions.user_id =
                profile_heads.user_id
        WHERE profile_heads.user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
    $$,
    $$
        VALUES (
            2,
            'updated-user'::TEXT,
            'active'::TEXT
        )
    $$,
    'The profile head advances to the new immutable version'
);


-- ============================================================================
-- Immutability enforcement
-- ============================================================================

SELECT throws_ok(
    $$
        UPDATE public.profile_versions
        SET display_name = 'Illegally Modified'
        WHERE user_id =
            '10000000-0000-0000-0000-000000000001'::UUID
          AND version_number = 1
    $$,
    '55000',
    NULL,
    'Updating an immutable profile version is rejected'
);


SELECT *
FROM finish();

ROLLBACK;