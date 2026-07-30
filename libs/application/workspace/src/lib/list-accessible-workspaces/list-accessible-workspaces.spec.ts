import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { makeListAccessibleWorkspaceRepository, workspace } from '../testing';
import { listAccessibleWorkspaces } from './list-accessible-workspaces';

describe('listAccessibleWorkspaces', () => {
  it('delegates active workspace discovery to the repository', async () => {
    const { listAccessible, repositoryLayer } =
      makeListAccessibleWorkspaceRepository(() => Effect.succeed([workspace]));

    const result = await Effect.runPromise(
      listAccessibleWorkspaces.pipe(Effect.provide(repositoryLayer))
    );

    expect(result).toEqual([workspace]);
    expect(listAccessible).toHaveBeenCalledOnce();
  });
});
