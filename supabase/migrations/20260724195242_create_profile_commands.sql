-- ============================================================================
-- Immutable profile command layer
-- ============================================================================
--
-- The profile tables introduced by the previous migration intentionally
-- separate:
--
--   public.profiles          Stable identity
--   public.profile_versions  Immutable history
--   public.profile_heads     Mutable current-state projection
--
-- Clients must not coordinate inserts and head updates themselves. Doing so
-- would allow:
--
--   - competing profile versions;
--   - skipped version numbers;
--   - stale head pointers;
--   - head values that do not match the referenced version;
--   - partial writes when one statement succeeds and another fails.
--
-- This migration introduces transactional database commands that preserve
-- those invariants.
--
-- A profile change follows this sequence:
--
--   1. Lock the current profile head.
--   2. Read the current immutable version.
--   3. Insert the next immutable version.
--   4. Move the mutable head to the new version.
--   5. Commit the transaction.
--
-- PostgreSQL functions execute within the caller's transaction. If any step
-- fails, the entire operation is rolled back.
-- ============================================================================


-- ============================================================================
-- Private schema
-- ============================================================================

-- Internal database implementation details belong in a schema that is not
-- exposed as part of the application's public API.
CREATE SCHEMA IF NOT EXISTS private;


REVOKE ALL
ON SCHEMA private
FROM PUBLIC;


COMMENT ON SCHEMA private IS
    'Internal database implementation details that are not exposed as application RPC functions.';


-- ============================================================================
-- Automatic profile creation
-- ============================================================================

-- This trigger function creates the application profile immediately after a
-- Supabase Auth user is created.
--
-- The function inserts:
--
--   1. the stable profile identity;
--   2. profile version 1;
--   3. the corresponding current profile head.
--
-- All three writes execute atomically. A partially initialized profile cannot
-- be created.
CREATE OR REPLACE FUNCTION private.create_profile_for_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    initial_username TEXT;
    initial_display_name TEXT;
    initial_avatar_url TEXT;
    initial_profile_version_id UUID;
BEGIN
    -- Usernames are optional.
    --
    -- Only an explicitly supplied username is used. The username is not derived
    -- automatically from the email address because:
    --
    --   - email local parts are not necessarily suitable usernames;
    --   - two users may request the same username;
    --   - username uniqueness should be handled explicitly.
    initial_username :=
        NULLIF(
            trim(NEW.raw_user_meta_data ->> 'username'),
            ''
        );

    -- display_name is required by profile_versions.
    --
    -- Prefer explicit profile metadata, then commonly used OAuth metadata, then
    -- the email local part. The final fallback covers identity providers that
    -- supply neither a name nor an email address.
    initial_display_name :=
        COALESCE(
            NULLIF(
                trim(NEW.raw_user_meta_data ->> 'display_name'),
                ''
            ),
            NULLIF(
                trim(NEW.raw_user_meta_data ->> 'full_name'),
                ''
            ),
            NULLIF(
                trim(NEW.raw_user_meta_data ->> 'name'),
                ''
            ),
            NULLIF(
                split_part(COALESCE(NEW.email, ''), '@', 1),
                ''
            ),
            'User'
        );

    initial_avatar_url :=
        COALESCE(
            NULLIF(
                trim(NEW.raw_user_meta_data ->> 'avatar_url'),
                ''
            ),
            NULLIF(
                trim(NEW.raw_user_meta_data ->> 'picture'),
                ''
            )
        );

    -- Create the stable application identity.
    INSERT INTO public.profiles (
        user_id
    )
    VALUES (
        NEW.id
    );

    -- Create the first immutable profile snapshot.
    INSERT INTO public.profile_versions (
        user_id,
        version_number,
        username,
        display_name,
        avatar_url,
        status,
        supersedes_profile_version_id
    )
    VALUES (
        NEW.id,
        1,
        initial_username,
        initial_display_name,
        initial_avatar_url,
        'active',
        NULL
    )
    RETURNING profile_version_id
    INTO initial_profile_version_id;

    -- Establish the current-state projection.
    INSERT INTO public.profile_heads (
        user_id,
        profile_version_id,
        current_username,
        profile_status
    )
    VALUES (
        NEW.id,
        initial_profile_version_id,
        initial_username,
        'active'
    );

    RETURN NEW;
END;
$$;


COMMENT ON FUNCTION private.create_profile_for_auth_user() IS
    'Creates the stable profile identity, initial immutable profile version, and current head after an Auth user is inserted.';


-- The trigger runs only for newly created Auth users.
--
-- Existing users are not backfilled automatically by CREATE TRIGGER. During
-- early development, `supabase db reset` is normally sufficient because users
-- are recreated from a clean database.
CREATE TRIGGER auth_users_create_profile
AFTER INSERT
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.create_profile_for_auth_user();


-- ============================================================================
-- Self-service immutable profile update
-- ============================================================================

-- This is the public RPC command used by an authenticated user to update their
-- own profile.
--
-- The function does not UPDATE profile_versions. It inserts a complete new
-- snapshot and advances profile_heads.
--
-- Profile status is intentionally not accepted as an argument. Users must not
-- be able to:
--
--   - unban themselves;
--   - reactivate administratively deactivated accounts;
--   - assign arbitrary status values.
--
-- Status transitions will be handled by a separate administrative command.
CREATE OR REPLACE FUNCTION public.update_my_profile(
    p_display_name TEXT,
    p_username TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS public.profile_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    authenticated_user_id UUID;

    normalized_display_name TEXT;
    normalized_username TEXT;
    normalized_avatar_url TEXT;

    current_profile_version_id UUID;
    current_version_number INTEGER;
    profile_status TEXT;

    new_profile_version public.profile_versions;
BEGIN
    authenticated_user_id := auth.uid();

    IF authenticated_user_id IS NULL THEN
        RAISE EXCEPTION
            'Authentication is required to update a profile'
            USING ERRCODE = '28000';
    END IF;

    normalized_display_name := trim(p_display_name);

    IF normalized_display_name = '' THEN
        RAISE EXCEPTION
            'Display name must not be blank'
            USING ERRCODE = '22023';
    END IF;

    normalized_username :=
        NULLIF(
            trim(p_username),
            ''
        );

    normalized_avatar_url :=
        NULLIF(
            trim(p_avatar_url),
            ''
        );

    -- Lock the current head before calculating the next version.
    --
    -- The row lock serializes concurrent updates for the same profile. A second
    -- request waits until the first commits, then reads the newly advanced head
    -- and creates the following version.
    SELECT
        profile_heads.profile_version_id,
        profile_versions.version_number,
        profile_heads.profile_status
    INTO
        current_profile_version_id,
        current_version_number,
        profile_status
    FROM public.profile_heads
    INNER JOIN public.profile_versions
        ON profile_versions.profile_version_id =
            profile_heads.profile_version_id
        AND profile_versions.user_id =
            profile_heads.user_id
    WHERE profile_heads.user_id = authenticated_user_id
    FOR UPDATE OF profile_heads;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Profile not found for authenticated user'
            USING ERRCODE = 'P0002';
    END IF;

    -- Append a new immutable profile snapshot.
    --
    -- The status is copied from the current head because this self-service
    -- command is not permitted to change account lifecycle state.
    INSERT INTO public.profile_versions (
        user_id,
        version_number,
        username,
        display_name,
        avatar_url,
        status,
        supersedes_profile_version_id
    )
    VALUES (
        authenticated_user_id,
        current_version_number + 1,
        normalized_username,
        normalized_display_name,
        normalized_avatar_url,
        profile_status,
        current_profile_version_id
    )
    RETURNING *
    INTO new_profile_version;

    -- Move the mutable projection to the newly inserted immutable version.
    --
    -- current_username and profile_status are copied from the same values used
    -- for the immutable row so that the projection cannot diverge from it.
    UPDATE public.profile_heads
    SET
        profile_version_id =
            new_profile_version.profile_version_id,
        current_username =
            new_profile_version.username,
        profile_status =
            new_profile_version.status
    WHERE user_id = authenticated_user_id;

    RETURN new_profile_version;
END;
$$;


COMMENT ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT) IS
    'Appends an immutable profile snapshot for the authenticated user and atomically advances the current profile head.';


-- ============================================================================
-- Direct mutation restrictions
-- ============================================================================

-- Authenticated and anonymous clients must not construct profile history
-- manually.
--
-- Writes must pass through approved command functions so version ordering,
-- locking, supersession, and head synchronization remain consistent.
REVOKE INSERT, UPDATE, DELETE
ON TABLE public.profiles
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.profile_versions
FROM anon, authenticated;


REVOKE INSERT, UPDATE, DELETE
ON TABLE public.profile_heads
FROM anon, authenticated;


-- PostgreSQL grants function execution to PUBLIC by default unless explicitly
-- revoked. Start from a deny-by-default state.
REVOKE ALL
ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT)
FROM PUBLIC;


-- Only authenticated users may invoke the self-service command.
GRANT EXECUTE
ON FUNCTION public.update_my_profile(TEXT, TEXT, TEXT)
TO authenticated;


-- The private trigger function must not be invoked directly by application
-- roles.
REVOKE ALL
ON FUNCTION private.create_profile_for_auth_user()
FROM PUBLIC, anon, authenticated;


-- ============================================================================
-- Read model
-- ============================================================================

-- This view exposes the current profile state without requiring application
-- queries to understand the version-and-head implementation.
--
-- Historical versions remain available through profile_versions for authorized
-- audit or administration use.
CREATE VIEW public.current_profiles
WITH (security_invoker = TRUE)
AS
SELECT
    profiles.user_id,
    profile_versions.username,
    profile_versions.display_name,
    profile_versions.avatar_url,
    profile_versions.status,
    profile_versions.version_number,
    profiles.created_at,
    profile_versions.created_at AS version_created_at
FROM public.profiles
INNER JOIN public.profile_heads
    ON profile_heads.user_id = profiles.user_id
INNER JOIN public.profile_versions
    ON profile_versions.profile_version_id =
        profile_heads.profile_version_id
    AND profile_versions.user_id =
        profile_heads.user_id;


COMMENT ON VIEW public.current_profiles IS
    'Current profile read model produced by joining stable profile identities, mutable heads, and immutable profile versions.';


GRANT SELECT
ON TABLE public.current_profiles
TO authenticated;