import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  archivedWorkspace,
  makeListArchivedWorkspaceRepository,
} from '../testing';
import { listArchivedWorkspaces } from './list-archived-workspaces';

describe('listArchivedWorkspaces', () => {
  it('delegates archived discovery to the repository', async () => {
    const { listArchived, repositoryLayer } =
      makeListArchivedWorkspaceRepository(() =>
        Effect.succeed([archivedWorkspace])
      );

    const result = await Effect.runPromise(
      listArchivedWorkspaces.pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toEqual([archivedWorkspace]);
    expect(listArchived).toHaveBeenCalledOnce();
  });
});
