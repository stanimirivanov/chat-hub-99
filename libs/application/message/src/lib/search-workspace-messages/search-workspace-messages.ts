import { Effect, Schema } from 'effect';
import {
  MessageRepositoryTag,
  type MessageRepository,
  type WorkspaceMessageSearchResult,
} from '../repository';
import type { SearchWorkspaceMessagesInput } from './search-workspace-messages-input';
import {
  InvalidMessageSearchQueryError,
  type SearchWorkspaceMessagesError,
} from './search-workspace-messages-error';

const SearchQuerySchema = Schema.String.pipe(
  Schema.minLength(2),
  Schema.maxLength(200)
);

const decodeSearchQuery = Schema.decodeUnknown(SearchQuerySchema);

/**
 * Searches the caller-visible active messages in one workspace.
 *
 * Text is normalized before the repository is invoked. The repository owns
 * relevance ordering and the fixed result cap because both must remain aligned
 * with its database query.
 */
export const searchWorkspaceMessages = (
  input: SearchWorkspaceMessagesInput
): Effect.Effect<
  readonly WorkspaceMessageSearchResult[],
  SearchWorkspaceMessagesError,
  MessageRepository
> =>
  Effect.gen(function* () {
    const normalizedQuery =
      typeof input?.query === 'string' ? input.query.trim() : '';

    const query = yield* decodeSearchQuery(normalizedQuery).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidMessageSearchQueryError({
            cause,
          })
      )
    );

    const repository = yield* MessageRepositoryTag;

    return yield* repository.searchWorkspace({
      workspaceId: input.workspaceId,
      query,
    });
  });
