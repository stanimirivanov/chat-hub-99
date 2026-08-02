import { Effect, Schema } from 'effect';
import {
  MessageRevisionPageSizeSchema,
  type MessageRevisionPage,
} from '../pagination';
import { MessageRepositoryTag, type MessageRepository } from '../repository';
import type { ListMessageRevisionsInput } from './list-message-revisions-input';
import {
  InvalidMessageRevisionPageLimitError,
  type ListMessageRevisionsError,
} from './list-message-revisions-error';

const DEFAULT_REVISION_PAGE_LIMIT = 20;
const decodePageSize = Schema.decodeUnknown(MessageRevisionPageSizeSchema);

/** Lists one newest-first page of immutable revisions for a message. */
export const listMessageRevisions = (
  input: ListMessageRevisionsInput
): Effect.Effect<
  MessageRevisionPage,
  ListMessageRevisionsError,
  MessageRepository
> =>
  Effect.gen(function* () {
    const rawLimit = input.limit ?? DEFAULT_REVISION_PAGE_LIMIT;
    const limit = yield* decodePageSize(rawLimit).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidMessageRevisionPageLimitError({
            limit: rawLimit,
            cause,
          })
      )
    );
    const repository = yield* MessageRepositoryTag;

    return yield* repository.listRevisions({
      messageId: input.messageId,
      limit,
      before: input.before,
    });
  });
