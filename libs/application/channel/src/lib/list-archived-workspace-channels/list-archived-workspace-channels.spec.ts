import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  archivedChannel,
  makeListArchivedByWorkspaceChannelRepository,
  workspaceId,
} from '../testing';
import { listArchivedWorkspaceChannels } from './list-archived-workspace-channels';

describe('listArchivedWorkspaceChannels', () => {
  it('delegates owner-visible archive discovery to the repository', async () => {
    const { listArchivedByWorkspace, repositoryLayer } =
      makeListArchivedByWorkspaceChannelRepository(() =>
        Effect.succeed([archivedChannel])
      );

    const result = await Effect.runPromise(
      listArchivedWorkspaceChannels(workspaceId).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(result).toEqual([archivedChannel]);
    expect(listArchivedByWorkspace).toHaveBeenCalledExactlyOnceWith(
      workspaceId
    );
  });
});
