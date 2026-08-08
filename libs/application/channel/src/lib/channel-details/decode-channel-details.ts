import { Effect, Schema } from 'effect';
import { ChannelNameSchema } from '@omoikane/domain/channel';

const decodeString = Schema.decodeUnknown(Schema.String);
const decodeChannelName = Schema.decodeUnknown(ChannelNameSchema);

export type ChannelDetailsField = 'name' | 'description';

export interface ChannelDetails {
  readonly name: string;
  readonly description: string | null;
}

const readInputField = (input: unknown, field: ChannelDetailsField): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

/**
 * Normalizes and validates mutable channel details shared by creation and
 * update workflows. Each caller supplies its own typed boundary-error factory.
 */
export const decodeChannelDetails = <Failure>(
  input: unknown,
  invalidField: (field: ChannelDetailsField, cause: unknown) => Failure
): Effect.Effect<ChannelDetails, Failure> =>
  Effect.all({
    name: decodeString(readInputField(input, 'name')).pipe(
      Effect.map((value) => value.trim()),
      Effect.flatMap(decodeChannelName),
      Effect.mapError((cause) => invalidField('name', cause))
    ),
    description: decodeString(readInputField(input, 'description') ?? '').pipe(
      Effect.map((value) => value.trim()),
      Effect.map((value) => (value.length === 0 ? null : value)),
      Effect.mapError((cause) => invalidField('description', cause))
    ),
  });
