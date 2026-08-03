import { Effect, Stream } from 'effect';
import type { Workspace } from '@chat-hub/domain/workspace';
import {
  WorkspaceRepositoryTag,
  type WorkspaceRepository,
  type WorkspaceRepositoryReadError,
} from '../repository';

/**
 * Observes authoritative accessible-workspace snapshots for the current user.
 *
 * The repository stream emits only invalidation signals. Each signal is
 * resolved through the ordinary `listAccessible` read, so initial and
 * realtime data share the same RLS protection, runtime validation, ordering,
 * and error translation. The stream can fail with repository read failures
 * and requires `WorkspaceRepository` to be supplied.
 */
export const observeAccessibleWorkspaces: Stream.Stream<
  readonly Workspace[],
  WorkspaceRepositoryReadError,
  WorkspaceRepository
> = Stream.unwrap(
  Effect.gen(function* () {
    const repository = yield* WorkspaceRepositoryTag;

    return repository
      .accessChanges()
      .pipe(Stream.mapEffect(() => repository.listAccessible()));
  })
);
