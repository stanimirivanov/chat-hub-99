import { Data, Effect, Schema, Stream } from 'effect';
import type { Channel } from '@omoikane/domain/channel';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import {
  ChannelRepositoryTag,
  type ChannelRepository,
  type ChannelRepositoryReadError,
} from '../repository';

const ObserveWorkspaceChannelsInputSchema = Schema.Struct({
  workspaceId: WorkspaceIdSchema,
});

/** Indicates that a workspace-channel observation boundary received bad input. */
export class InvalidWorkspaceChannelObservationInputError extends Data.TaggedError(
  'InvalidWorkspaceChannelObservationInputError'
)<{
  readonly cause: unknown;
}> {}

export type ObserveWorkspaceChannelsError =
  | InvalidWorkspaceChannelObservationInputError
  | ChannelRepositoryReadError;

/**
 * Observes authoritative active-channel snapshots for one workspace.
 *
 * The repository stream carries only invalidations. Each signal is resolved
 * through `listByWorkspace`, so initial and realtime data share the same RLS
 * policy, runtime decoding, stable ordering, and provider-error translation.
 */
export const observeWorkspaceChannels = (
  input: unknown
): Stream.Stream<
  readonly Channel[],
  ObserveWorkspaceChannelsError,
  ChannelRepository
> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const { workspaceId } = yield* Schema.decodeUnknown(
        ObserveWorkspaceChannelsInputSchema
      )(input).pipe(
        Effect.mapError(
          (cause) => new InvalidWorkspaceChannelObservationInputError({ cause })
        )
      );
      const repository = yield* ChannelRepositoryTag;

      return repository
        .changesByWorkspace(workspaceId)
        .pipe(Stream.mapEffect(() => repository.listByWorkspace(workspaceId)));
    })
  );
