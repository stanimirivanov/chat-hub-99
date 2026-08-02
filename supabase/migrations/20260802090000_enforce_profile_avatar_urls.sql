-- ============================================================================
-- Profile avatar URL invariant
-- ============================================================================
--
-- Avatar values are rendered as external image sources by the browser client.
-- Persisted profile snapshots therefore accept only trimmed HTTPS URLs with a
-- bounded length and no embedded user credentials. Blank values continue to
-- be normalized to NULL by profile commands.
--
-- This constraint protects every writer, including direct RPC calls and future
-- trusted adapters; Angular and application validation remain early feedback,
-- not the database authorization or integrity boundary.
-- ============================================================================

ALTER TABLE public.profile_versions
ADD CONSTRAINT profile_versions_avatar_url_valid
CHECK (
    avatar_url IS NULL
    OR (
        avatar_url = trim(avatar_url)
        AND length(avatar_url) <= 2048
        AND avatar_url ~
            '^https://[^[:space:]/?#:@]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'
    )
);


COMMENT ON CONSTRAINT profile_versions_avatar_url_valid
ON public.profile_versions IS
    'Allows absent avatars or trimmed HTTPS URLs up to 2048 characters without embedded credentials.';
