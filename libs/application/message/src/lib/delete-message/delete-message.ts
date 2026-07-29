import { Effect } from 'effect';
import type { Message } from '@chat-hub/domain/message';
import { MessageRepositoryTag, type MessageRepository } from '../repository';
import type { DeleteMessageError } from './delete-message-error';
import type { DeleteMessageInput } from './delete-message-input';

/**
 * Soft-deletes an existing message and returns its current deleted projection.
 *
 * The repository records the deletion according to the persistence model.
 * The subsequent read returns the canonical current projection rather than
 * requiring the application layer to construct a deleted message itself.
 *
 * This keeps persistence-controlled values such as `deletedAt` inside the
 * repository boundary.
 *
 * @returns An Effect whose success value is the current deleted projection,
 * whose typed failure is a repository failure, and whose requirement is the
 * message repository port.
 */
export const deleteMessage = (
  input: DeleteMessageInput
): Effect.Effect<Message, DeleteMessageError, MessageRepository> =>
  Effect.gen(function* () {
    const repository = yield* MessageRepositoryTag;

    yield* repository.delete({
      messageId: input.messageId,
    });

    return yield* repository.findById(input.messageId);
  });
