import { Effect, Schema, Stream } from 'effect';
import type { ProfileId } from '@omoikane/domain/profile';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import {
  InvalidWorkspacePresenceInputError,
  type WorkspacePresenceUnavailableError,
} from './workspace-presence-error';
import {
  WorkspacePresenceServiceTag,
  type WorkspacePresenceService,
} from './workspace-presence-service';

/** Untrusted input accepted by workspace-presence observation. */
export interface ObserveWorkspacePresenceInput {
  readonly workspaceId?: unknown;
}

/**
 * Tracks and observes online profiles in one workspace.
 *
 * The workspace identity is runtime-validated before the provider service is
 * requested. The resulting stream can fail with validation or translated
 * observation failures and requires `WorkspacePresenceService`.
 */
export const observeWorkspacePresence = (
  input?: ObserveWorkspacePresenceInput | null
): Stream.Stream<
  readonly ProfileId[],
  InvalidWorkspacePresenceInputError | WorkspacePresenceUnavailableError,
  WorkspacePresenceService
> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const workspaceId = yield* Schema.decodeUnknown(WorkspaceIdSchema)(
        input?.workspaceId
      ).pipe(
        Effect.mapError(
          () => new InvalidWorkspacePresenceInputError({ field: 'workspaceId' })
        )
      );
      const presence = yield* WorkspacePresenceServiceTag;

      return presence.observe(workspaceId);
    })
  );
