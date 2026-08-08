import { Either, Schema } from 'effect';
import {
  ChannelTypingUnavailableError,
  type ChannelTypingEvent,
} from '@omoikane/application/channel';
import { ChannelIdSchema, type ChannelId } from '@omoikane/domain/channel';
import { ProfileIdSchema } from '@omoikane/domain/profile';

const ChannelTypingBroadcastSchema = Schema.Struct({
  payload: Schema.Struct({
    channelId: ChannelIdSchema,
    profileId: ProfileIdSchema,
    isTyping: Schema.Boolean,
  }),
});

/** Validates one external typing event and its selected-channel scope. */
export const mapChannelTypingEvent = (
  payload: unknown,
  expectedChannelId: ChannelId
): Either.Either<ChannelTypingEvent, ChannelTypingUnavailableError> =>
  Schema.decodeUnknownEither(ChannelTypingBroadcastSchema)(payload).pipe(
    Either.mapLeft((cause) => new ChannelTypingUnavailableError({ cause })),
    Either.flatMap((event) =>
      event.payload.channelId === expectedChannelId
        ? Either.right({
            profileId: event.payload.profileId,
            isTyping: event.payload.isTyping,
          })
        : Either.left(
            new ChannelTypingUnavailableError({
              cause: new Error('Typing event belongs to another channel.'),
            })
          )
    )
  );
