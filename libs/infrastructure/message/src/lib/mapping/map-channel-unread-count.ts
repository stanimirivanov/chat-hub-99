import { Effect, Schema } from 'effect';
import {
  InvalidMessageDataError,
  type ChannelUnreadCount,
} from '@omoikane/application/message';
import { ChannelIdSchema } from '@omoikane/domain/channel';

const ChannelUnreadCountSchema = Schema.Struct({
  channelId: ChannelIdSchema,
  unreadCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
});

const decodeChannelUnreadCount = Schema.decodeUnknown(ChannelUnreadCountSchema);

/** Validates one generated RPC row into the provider-independent projection. */
export const mapChannelUnreadCount = (
  row: unknown
): Effect.Effect<ChannelUnreadCount, InvalidMessageDataError> =>
  decodeChannelUnreadCount(
    typeof row === 'object' && row !== null
      ? {
          channelId: Reflect.get(row, 'channel_id'),
          unreadCount: Reflect.get(row, 'unread_count'),
        }
      : row
  ).pipe(
    Effect.mapError(
      (cause) =>
        new InvalidMessageDataError({
          cause,
        })
    )
  );
