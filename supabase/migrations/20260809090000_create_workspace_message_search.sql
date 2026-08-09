-- Workspace-scoped message search over the authoritative current projections.
--
-- The function is SECURITY INVOKER: the caller's RLS visibility on messages,
-- message heads, message versions, channels, and channel versions remains the
-- authorization boundary. Only active messages in active channels are
-- searchable; retained deleted content and archived collaboration history do
-- not appear in ordinary navigation search.

CREATE INDEX message_versions_content_search_idx
ON public.message_versions
USING gin (to_tsvector('simple', content));


CREATE FUNCTION public.search_workspace_messages(
    p_workspace_id uuid,
    p_search_query text,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    message_id uuid,
    workspace_id uuid,
    channel_id uuid,
    author_user_id uuid,
    created_at timestamptz,
    message_version_id uuid,
    version_number integer,
    content text,
    version_created_by uuid,
    version_created_at timestamptz,
    message_status text,
    deleted_by uuid,
    deleted_at timestamptz,
    updated_at timestamptz,
    is_edited boolean,
    channel_name text,
    channel_slug text,
    search_rank real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    WITH search_input AS (
        SELECT websearch_to_tsquery(
            'simple',
            trim(p_search_query)
        ) AS query
    )
    SELECT
        current_messages.message_id,
        current_messages.workspace_id,
        current_messages.channel_id,
        current_messages.author_user_id,
        current_messages.created_at,
        current_messages.message_version_id,
        current_messages.version_number,
        current_messages.content,
        current_messages.version_created_by,
        current_messages.version_created_at,
        current_messages.message_status,
        current_messages.deleted_by,
        current_messages.deleted_at,
        current_messages.updated_at,
        current_messages.is_edited,
        current_channels.name AS channel_name,
        current_channels.slug AS channel_slug,
        ts_rank_cd(
            to_tsvector('simple', current_messages.content),
            search_input.query
        ) AS search_rank
    FROM public.current_messages
    INNER JOIN public.current_channels
        ON current_channels.channel_id = current_messages.channel_id
       AND current_channels.workspace_id = current_messages.workspace_id
    CROSS JOIN search_input
    WHERE current_messages.workspace_id = p_workspace_id
      AND current_messages.message_status = 'active'
      AND current_channels.channel_status = 'active'
      AND current_messages.content IS NOT NULL
      AND trim(p_search_query) <> ''
      AND to_tsvector('simple', current_messages.content)
          @@ search_input.query
    ORDER BY
        search_rank DESC,
        current_messages.created_at DESC,
        current_messages.message_id DESC
    LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
$$;


COMMENT ON FUNCTION public.search_workspace_messages(uuid, text, integer) IS
    'Returns RLS-visible active messages in active channels, ranked within one workspace by simple-dictionary full-text relevance and recency.';


REVOKE ALL
ON FUNCTION public.search_workspace_messages(uuid, text, integer)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.search_workspace_messages(uuid, text, integer)
TO authenticated;
