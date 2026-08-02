import { Effect } from 'effect';
import type {
  InvalidMessageDataError,
  ListMessageRevisionsQuery,
  MessageRevisionPage,
  MessageRepositoryError,
} from '@chat-hub/application/message';
import type { MessageRevision } from '@chat-hub/domain/message';
import type { TableRow } from '@chat-hub/shared/database';
import {
  mapPostgrestError,
  mapThrownRepositoryError,
} from '../errors/message-repository-error-mapper';
import { mapMessageRevision } from '../mapping/map-message-revision';
import type { ChatHubSupabaseClient } from '../supabase-message-client';

const REVISION_COLUMNS =
  'message_version_id, message_id, version_number, content, created_by, created_at';

/** Lists immutable revisions using the monotonic version number as a cursor. */
export const listMessageRevisions = (
  client: ChatHubSupabaseClient,
  query: ListMessageRevisionsQuery
): Effect.Effect<MessageRevisionPage, MessageRepositoryError> =>
  executeQuery(client, query).pipe(
    Effect.flatMap(({ data, error }) =>
      error === null
        ? mapRevisionPage(data ?? [], Number(query.limit))
        : Effect.fail(mapPostgrestError('read', error))
    )
  );

const executeQuery = (
  client: ChatHubSupabaseClient,
  query: ListMessageRevisionsQuery
) =>
  Effect.tryPromise({
    try: async () => {
      let databaseQuery = client
        .from('message_versions')
        .select(REVISION_COLUMNS)
        .eq('message_id', query.messageId)
        .order('version_number', { ascending: false })
        .limit(Number(query.limit) + 1);

      if (query.before !== undefined) {
        databaseQuery = databaseQuery.lt(
          'version_number',
          Number(query.before.versionNumber)
        );
      }

      return databaseQuery;
    },
    catch: (cause) => mapThrownRepositoryError('read', cause),
  });

const mapRevisionPage = (
  rows: readonly TableRow<'message_versions'>[],
  requestedLimit: number
): Effect.Effect<MessageRevisionPage, InvalidMessageDataError> =>
  Effect.forEach(rows, mapMessageRevision).pipe(
    Effect.map((revisions) =>
      buildMessageRevisionPage(revisions, requestedLimit)
    )
  );

/** Removes the look-ahead row and derives the next older version cursor. */
export const buildMessageRevisionPage = (
  mappedRevisions: readonly MessageRevision[],
  requestedLimit: number
): MessageRevisionPage => {
  const hasNextPage = mappedRevisions.length > requestedLimit;
  const revisions = mappedRevisions.slice(0, requestedLimit);
  const lastRevision = revisions[revisions.length - 1];

  return {
    revisions,
    nextCursor:
      hasNextPage && lastRevision !== undefined
        ? { versionNumber: lastRevision.versionNumber }
        : null,
  };
};
