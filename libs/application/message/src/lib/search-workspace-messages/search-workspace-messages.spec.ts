import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { searchWorkspaceMessages } from './search-workspace-messages';
import { makeSearchWorkspaceRepository } from '../testing';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000009'
);

describe('searchWorkspaceMessages', () => {
  it('normalizes the query before invoking the repository', async () => {
    const { searchWorkspace, repositoryLayer } = makeSearchWorkspaceRepository(
      () => Effect.succeed([])
    );

    const results = await Effect.runPromise(
      searchWorkspaceMessages({
        workspaceId,
        query: '  project decision  ',
      }).pipe(Effect.provide(repositoryLayer))
    );

    expect(results).toEqual([]);
    expect(searchWorkspace).toHaveBeenCalledWith({
      workspaceId,
      query: 'project decision',
    });
  });

  it.each(['', ' ', 'x', 'x'.repeat(201)])(
    'rejects unsupported query %j before persistence',
    async (query) => {
      const { searchWorkspace, repositoryLayer } =
        makeSearchWorkspaceRepository(() => Effect.succeed([]));

      const error = await Effect.runPromise(
        searchWorkspaceMessages({ workspaceId, query }).pipe(
          Effect.provide(repositoryLayer),
          Effect.flip
        )
      );

      expect(error._tag).toBe('InvalidMessageSearchQueryError');
      expect(searchWorkspace).not.toHaveBeenCalled();
    }
  );
});
