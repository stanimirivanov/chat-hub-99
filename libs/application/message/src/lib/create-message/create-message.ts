import { Effect, Schema } from 'effect';

import { MessageContentSchema, type Message } from '@omoikane/domain/message';
import { MessageRepositoryTag, type MessageRepository } from '../repository';
import {
  InvalidMessageContentError,
  type CreateMessageError,
} from './create-message-error';
import type { CreateMessageInput } from './create-message-input';

const decodeMessageContent = Schema.decodeUnknown(MessageContentSchema);

/**
 * Creates a message and returns its current validated projection.
 */
export const createMessage = (
  input: CreateMessageInput
): Effect.Effect<Message, CreateMessageError, MessageRepository> =>
  Effect.gen(function* () {
    const content = yield* decodeMessageContent(input.content).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidMessageContentError({
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
