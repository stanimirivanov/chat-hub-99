import { Effect, Schema } from 'effect';
import { ChannelSlugSchema, type Channel } from '@chat-hub/domain/channel';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import {
  ChannelRepositoryTag,
  type ChannelRepository,
  type CreateChannelCommand,
} from '../repository';
import { decodeChannelDetails } from '../channel-details/decode-channel-details';
import {
  InvalidChannelCreationInputError,
  type ChannelCreationField,
  type CreateChannelError,
} from './create-channel-error';

const decodeString = Schema.decodeUnknown(Schema.String);
const decodeWorkspaceId = Schema.decodeUnknown(WorkspaceIdSchema);
const decodeChannelSlug = Schema.decodeUnknown(ChannelSlugSchema);

const readInputField = (
  input: unknown,
  field: ChannelCreationField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

const invalidField = (
  field: ChannelCreationField,
  cause: unknown
): InvalidChannelCreationInputError =>
  new InvalidChannelCreationInputError({ field, cause });

const decodeWorkspace = (input: unknown) =>
  decodeWorkspaceId(readInputField(input, 'workspaceId')).pipe(
    Effect.mapError((cause) => invalidField('workspaceId', cause))
  );

const decodeSlug = (
  input: unknown
): Effect.Effect<string, InvalidChannelCreationInputError> =>
  decodeString(readInputField(input, 'slug')).pipe(
    Effect.map((value) => value.trim().toLowerCase()),
    Effect.flatMap(decodeChannelSlug),
    Effect.mapError((cause) => invalidField('slug', cause))
  );

/**
 * Creates a public channel in an active workspace for the authenticated user.
 *
 * Unknown boundary values are normalized and validated before repository
 * access. Actor identity and membership are intentionally absent because the
 * database command derives and authorizes the current provider session. The
 * Effect succeeds with a validated channel projection, can fail with input or
 * repository errors, and requires `ChannelRepository` to be supplied.
 */
export const createChannel = (
  input: unknown
): Effect.Effect<Channel, CreateChannelError, ChannelRepository> =>
  Effect.gen(function* () {
    const workspaceId = yield* decodeWorkspace(input);
    const details = yield* decodeChannelDetails(input, invalidField);
    const command: CreateChannelCommand = {
      workspaceId,
      slug: yield* decodeSlug(input),
      ...details,
    };

    const repository = yield* ChannelRepositoryTag;
    const id = yield* repository.create(command);

    return {
      id,
      ...command,
    };
  });
