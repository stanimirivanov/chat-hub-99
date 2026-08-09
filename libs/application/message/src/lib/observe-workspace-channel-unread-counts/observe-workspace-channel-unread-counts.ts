import { Data, Effect, Schema, Stream } from 'effect';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import {
  MessageRepositoryTag,
  type ChannelUnreadCount,
  type MessageRepository,
  type MessageRepositoryError,
} from '../repository';

const InputSchema = Schema.Struct({
  workspaceId: WorkspaceIdSchema,
});

/** Indicates that unread observation received an invalid workspace identity. */
export class InvalidWorkspaceUnreadObservationInputError extends Data.TaggedError(
  'InvalidWorkspaceUnreadObservationInputError'
)<{
  readonly cause: unknown;
}> {}

export type ObserveWorkspaceChannelUnreadCountsError =
  | InvalidWorkspaceUnreadObservationInputError
  | MessageRepositoryError;

/**
 * Observes authoritative unread-count snapshots for one workspace.
 *
 * Repository events are invalidations rather than data. Every signal reloads
 * the same persisted snapshot used by the initial query, keeping ordering,
 * count semantics, RLS, decoding, and provider-error mapping in one place.
 */
export const observeWorkspaceChannelUnreadCounts = (
  input: unknown
): Stream.Stream<
  readonly ChannelUnreadCount[],
  ObserveWorkspaceChannelUnreadCountsError,
  MessageRepository
> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const { workspaceId } = yield* Schema.decodeUnknown(InputSchema)(
        input
      ).pipe(
        Effect.mapError(
          (cause) => new InvalidWorkspaceUnreadObservationInputError({ cause })
        )
      );
      const repository = yield* MessageRepositoryTag;

      return repository
        .unreadChangesByWorkspace(workspaceId)
        .pipe(
          Stream.mapEffect(() => repository.listUnreadByWorkspace(workspaceId))
        );
    })
  );
