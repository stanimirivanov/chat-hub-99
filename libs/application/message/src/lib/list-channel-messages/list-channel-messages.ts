import { Effect, Schema } from 'effect';

import { MessagePageSizeSchema } from '../pagination';
import { MessageRepositoryTag } from '../repository';
import type { ListChannelMessagesInput } from './list-channel-messages-input';
import { InvalidMessagePageLimitError } from './list-channel-messages-error';

const DEFAULT_PAGE_LIMIT = 50;

const decodeMessagePageSize = Schema.decodeUnknown(MessagePageSizeSchema);

export const listChannelMessages = (input: ListChannelMessagesInput) =>
  Effect.gen(function* () {
    const rawLimit = input.limit ?? DEFAULT_PAGE_LIMIT;

    const limit = yield* decodeMessagePageSize(rawLimit).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidMessagePageLimitError({
            limit: rawLimit,
            cause,
          })
      )
    );

    const repository = yield* MessageRepositoryTag;

    return yield* repository.listByChannel({
      channelId: input.channelId,
      limit,
      before: input.before,
    });
  });
