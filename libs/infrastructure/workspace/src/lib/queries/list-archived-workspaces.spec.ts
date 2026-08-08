import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  currentArchivedWorkspaceRow,
  makeWorkspaceListClientStub,
} from '../testing';
import { listArchivedWorkspaces } from './list-archived-workspaces';

describe('listArchivedWorkspaces', () => {
  it('queries archived workspaces newest first', async () => {
    const stub = makeWorkspaceListClientStub({
      data: [currentArchivedWorkspaceRow],
      error: null,
    });

    const result = await Effect.runPromise(listArchivedWorkspaces(stub.client));

    expect(result[0]?.archivedAt).toEqual(new Date('2026-08-08T09:00:00.000Z'));
    expect(stub.select).toHaveBeenCalledExactlyOnceWith(
      'workspace_id, name, slug, description, version_created_at'
    );
    expect(stub.eq).toHaveBeenCalledExactlyOnceWith('status', 'archived');
    expect(stub.order).toHaveBeenNthCalledWith(1, 'version_created_at', {
      ascending: false,
    });
    expect(stub.order).toHaveBeenNthCalledWith(2, 'workspace_id', {
      ascending: true,
    });
  });

  it('rejects malformed archive timestamps', async () => {
    const stub = makeWorkspaceListClientStub({
      data: [{ ...currentArchivedWorkspaceRow, version_created_at: 'invalid' }],
      error: null,
    });

    const result = await Effect.runPromise(
      listArchivedWorkspaces(stub.client).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceDataError');
    }
  });
});
