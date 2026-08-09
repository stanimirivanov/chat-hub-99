import { Effect } from 'effect';
import type { Message } from '@omoikane/domain/message';
import {
  MessageNotFoundError,
  MessageRepositoryTag,
  type MessageRepository,
  type MessageRepositoryError,
} from '../repository';
import type { GetChannelMessageInput } from './get-channel-message-input';

/**
 * Resolves one RLS-visible message and verifies that it belongs to the route's
 * selected channel.
 *
 * A mismatched channel is reported as not found so a stale or manipulated URL
 * cannot disclose that the message belongs somewhere else.
 */
export const getChannelMessage = (
  input: GetChannelMessageInput
): Effect.Effect<Message, MessageRepositoryError, MessageRepository> =>
  Effect.gen(function* () {
    const repository = yield* MessageRepositoryTag;
    const message = yield* repository.findById(input.messageId);

    if (message.channelId !== input.channelId) {
      return yield* new MessageNotFoundError({
        messageId: input.messageId,
      });
    }

    return message;
  });
