import { Effect, Schema } from 'effect';
import { ChannelIdSchema, type ChannelId } from '@chat-hub/domain/channel';

const decodeString = Schema.decodeUnknown(Schema.String);

const readChannelId = (input: unknown): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, 'channelId')
    : undefined;

/**
 * Normalizes and validates the channel identity shared by channel command
 * boundaries. Each caller supplies its own typed validation-error factory.
 */
export const decodeChannelId = <Failure>(
  input: unknown,
  invalid: (cause: unknown) => Failure
): Effect.Effect<ChannelId, Failure> =>
  decodeString(readChannelId(input)).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(Schema.decodeUnknown(ChannelIdSchema)),
    Effect.mapError(invalid)
  );
