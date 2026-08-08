import { Either, Schema } from 'effect';
import {
  type MessageChangeNotification,
  InvalidMessageDataError,
} from '@omoikane/application/message';
import { ChannelIdSchema, type ChannelId } from '@omoikane/domain/channel';
import { MessageIdSchema } from '@omoikane/domain/message';

const MessageHeadChangePayloadSchema = Schema.Struct({
  eventType: Schema.Literal('INSERT', 'UPDATE'),
  new: Schema.Struct({
    message_id: MessageIdSchema,
    channel_id: ChannelIdSchema,
  }),
});

/**
 * Validates the identity-bearing portion of a Supabase message-head event.
 *
 * The requested channel is checked again even though the provider subscription
 * is filtered, preventing malformed or misrouted external payloads from
 * crossing the infrastructure boundary.
 */
export const mapMessageHeadChange = (
  payload: unknown,
  expectedChannelId: ChannelId
): Either.Either<MessageChangeNotification, InvalidMessageDataError> =>
  Schema.decodeUnknownEither(MessageHeadChangePayloadSchema)(payload).pipe(
    Either.mapLeft(
      (cause) =>
        new InvalidMessageDataError({
          cause,
        })
    ),
    Either.flatMap((change) =>
      change.new.channel_id === expectedChannelId
        ? Either.right({
            kind: change.eventType === 'INSERT' ? 'created' : 'updated',
            messageId: change.new.message_id,
          })
        : Either.left(
            new InvalidMessageDataError({
              cause: new Error(
                'Realtime message event belongs to a different channel.'
              ),
            })
          )
    )
  );
