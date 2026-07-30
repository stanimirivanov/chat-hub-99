import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { currentWorkspaceRow, makeWorkspaceListClientStub } from '../testing';
import { listAccessibleWorkspaces } from './list-accessible-workspaces';

describe('listAccessibleWorkspaces', () => {
  it('queries active workspaces in stable display order', async () => {
    const stub = makeWorkspaceListClientStub({
      data: [currentWorkspaceRow],
      error: null,
    });

    const result = await Effect.runPromise(
      listAccessibleWorkspaces(stub.client)
    );

    expect(result).toHaveLength(1);
    expect(stub.from).toHaveBeenCalledExactlyOnceWith('current_workspaces');
    expect(stub.select).toHaveBeenCalledExactlyOnceWith(
      'workspace_id, name, slug, description'
    );
    expect(stub.eq).toHaveBeenCalledExactlyOnceWith('status', 'active');
    expect(stub.order).toHaveBeenNthCalledWith(1, 'name', {
      ascending: true,
    });
    expect(stub.order).toHaveBeenNthCalledWith(2, 'workspace_id', {
      ascending: true,
    });
  });

  it('translates PostgREST failures', async () => {
    const stub = makeWorkspaceListClientStub({
      data: null,
      error: {
        code: '08006',
        message: 'Connection unavailable',
      },
    });

    const result = await Effect.runPromise(
      listAccessibleWorkspaces(stub.client).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);

    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });
});
