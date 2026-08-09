import { Effect } from 'effect';
import type {
  MessageRepositoryError,
  SearchWorkspaceMessagesQuery,
  WorkspaceMessageSearchResult,
} from '@omoikane/application/message';
import {
  mapPostgrestError,
  mapThrownRepositoryError,
} from '../errors/message-repository-error-mapper';
import { mapWorkspaceMessageSearchResult } from '../mapping/map-workspace-message-search-result';
import type { SupabaseMessageClient } from '../supabase-message-client';

const SEARCH_RESULT_LIMIT = 20;

/** Executes the fixed-cap, relevance-ranked workspace search RPC. */
export const searchWorkspaceMessages = (
  client: SupabaseMessageClient,
  query: SearchWorkspaceMessagesQuery
): Effect.Effect<
  readonly WorkspaceMessageSearchResult[],
  MessageRepositoryError
> =>
  Effect.tryPromise({
    try: async () =>
      client.rpc('search_workspace_messages', {
        p_workspace_id: query.workspaceId,
        p_search_query: query.query,
        p_limit: SEARCH_RESULT_LIMIT,
      }),
    catch: (cause) => mapThrownRepositoryError('read', cause),
  }).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? Effect.forEach(data ?? [], mapWorkspaceMessageSearchResult)
        : Effect.fail(mapPostgrestError('read', error))
    )
  );
