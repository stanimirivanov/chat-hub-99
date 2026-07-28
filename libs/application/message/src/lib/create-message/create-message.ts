import { Effect, Schema } from 'effect';
import { MessageContentSchema } from '@chat-hub/domain/message';
import { MessageRepositoryTag } from '../repository/message-repository';
import type { CreateMessageInput } from './create-message-input';
import { InvalidMessageContentError } from './invalid-message-content-error';

const decodeMessageContent = Schema.decodeUnknown(MessageContentSchema);

/** Creates a message and returns its current validated projection. */
export const createMessage = (input: CreateMessageInput) =>
  Effect.gen(function* () {
    const content = yield* decodeMessageContent(input.content).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidMessageContentError({
            content: input.content,
            cause,
          })
      )
    );

    const repository = yield* MessageRepositoryTag;

    const messageId = yield* repository.create({
      channelId: input.channelId,
      content,
    });

    return yield* repository.findById(messageId);
  });
