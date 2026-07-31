import { Effect, Schema, Stream } from 'effect';
import { ChannelIdSchema } from '@chat-hub/domain/channel';
import { MessageRepositoryTag, type MessageRepository } from '../repository';
import type { MessageChange } from './message-change';
import {
  InvalidChannelMessageObservationInputError,
  type ObserveChannelMessagesError,
} from './observe-channel-messages-error';

const ObserveChannelMessagesInputSchema = Schema.Struct({
  channelId: ChannelIdSchema,
});

/**
 * Observes authoritative current-message changes for one channel.
 *
 * Unknown boundary input is validated before the repository is requested.
 * Each repository notification is resolved through `findById`, keeping
 * realtime and ordinary reads on the same RLS-protected mapping path. The
 * stream can fail with input or repository errors and requires
 * `MessageRepository`.
 */
export const observeChannelMessages = (
  input: unknown
): Stream.Stream<
  MessageChange,
  ObserveChannelMessagesError,
  MessageRepository
> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const { channelId } = yield* Schema.decodeUnknown(
        ObserveChannelMessagesInputSchema
      )(input).pipe(
        Effect.mapError(
          (cause) =>
            new InvalidChannelMessageObservationInputError({
              cause,
            })
        )
      );

      const repository = yield* MessageRepositoryTag;

      return repository.changesByChannel(channelId).pipe(
        Stream.mapEffect(({ kind, messageId }) =>
          repository.findById(messageId).pipe(
            Effect.map(
              (message): MessageChange => ({
                kind,
                message,
              })
            )
          )
        )
      );
    })
  );
