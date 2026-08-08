import { Effect, Schema } from 'effect';
import { MessageContentSchema, type Message } from '@omoikane/domain/message';
import { MessageRepositoryTag, type MessageRepository } from '../repository';
import {
  InvalidEditedMessageContentError,
  type EditMessageError,
} from './edit-message-error';
import type { EditMessageInput } from './edit-message-input';

const decodeMessageContent = Schema.decodeUnknown(MessageContentSchema);

/**
 * Edits an existing message and returns its updated current projection.
 *
 * Content is normalized and validated before persistence. The repository
 * appends the immutable database version; the subsequent read returns the
 * canonical projection that presentation state can replace atomically.
 *
 * @returns An Effect whose success value is the updated message, whose typed
 * failure is validation or repository failure, and whose requirement is the
 * message repository port.
 */
export const editMessage = (
  input: EditMessageInput
): Effect.Effect<Message, EditMessageError, MessageRepository> =>
  Effect.gen(function* () {
    const content = yield* decodeMessageContent(input.content).pipe(
      Effect.mapError(
        (cause) => new InvalidEditedMessageContentError({ cause })
      )
    );

    const repository = yield* MessageRepositoryTag;

    yield* repository.edit({
      messageId: input.messageId,
      content,
    });

    return yield* repository.findById(input.messageId);
  });
