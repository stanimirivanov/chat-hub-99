import { Effect, Schema } from 'effect';
import { ChannelIdSchema } from '@chat-hub/domain/channel';
import { decodeChannelDetails } from '../channel-details/decode-channel-details';
import {
  ChannelRepositoryTag,
  type ChannelRepository,
  type UpdateChannelCommand,
} from '../repository';
import {
  InvalidChannelUpdateInputError,
  type ChannelUpdateField,
  type UpdateChannelError,
} from './update-channel-error';
import type { UpdatedChannelDetails } from './update-channel-input';

const decodeString = Schema.decodeUnknown(Schema.String);

const readChannelId = (input: unknown): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, 'channelId')
    : undefined;

const invalidField = (
  field: ChannelUpdateField,
  cause: unknown
): InvalidChannelUpdateInputError =>
  new InvalidChannelUpdateInputError({ field, cause });

const decodeChannelId = (input: unknown) =>
  decodeString(readChannelId(input)).pipe(
    Effect.map((value) => value.trim()),
    Effect.flatMap(Schema.decodeUnknown(ChannelIdSchema)),
    Effect.mapError((cause) => invalidField('channelId', cause))
  );

/**
 * Replaces the mutable details of one active channel.
 *
 * Unknown boundary values are normalized and validated before repository
 * access. Workspace association and slug are absent because the database
 * command keeps them immutable. Success returns the normalized details after
 * the repository validates its provider acknowledgment. The Effect preserves
 * typed authorization, lifecycle, provider, and data-validation failures and
 * requires `ChannelRepository`.
 */
export const updateChannel = (
  input: unknown
): Effect.Effect<
  UpdatedChannelDetails,
  UpdateChannelError,
  ChannelRepository
> =>
  Effect.gen(function* () {
    const channelId = yield* decodeChannelId(input);
    const details = yield* decodeChannelDetails(input, invalidField);
    const command: UpdateChannelCommand = { channelId, ...details };
    const repository = yield* ChannelRepositoryTag;

    yield* repository.update(command);

    return command;
  });
