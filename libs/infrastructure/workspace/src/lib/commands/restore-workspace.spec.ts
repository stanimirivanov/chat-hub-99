import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import {
  makeWorkspaceCommandClientStub,
  restoredWorkspaceRow,
} from '../testing';
import { restoreWorkspace } from './restore-workspace';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  restoredWorkspaceRow.workspace_id
);

describe('restoreWorkspace', () => {
  it('executes the restoration RPC and maps its active result', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: restoredWorkspaceRow,
      error: null,
    });

    const result = await Effect.runPromise(
      restoreWorkspace(stub.client, workspaceId)
    );

    expect(result).toEqual({
      id: workspaceId,
      name: restoredWorkspaceRow.name,
      slug: restoredWorkspaceRow.slug,
      description: restoredWorkspaceRow.description,
    });
    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('restore_workspace', {
      p_workspace_id: workspaceId,
    });
  });

  it.each([
    ['unauthenticated', { code: '28000', message: 'Authentication required' }],
    ['not owner', { code: '42501', message: 'Only active owners may restore' }],
    ['missing', { code: 'P0002', message: 'Workspace not found' }],
    [
      'already active',
      { code: '55000', message: 'Only archived workspaces can be restored' },
    ],
  ])('preserves %s as a restoration rejection', async (_label, error) => {
    const stub = makeWorkspaceCommandClientStub({ data: null, error });

    const result = await Effect.runPromise(
      restoreWorkspace(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRestoreNotAllowedError');
    }
  });

  it.each([
    ['missing result', null],
    [
      'wrong identity',
      {
        ...restoredWorkspaceRow,
        workspace_id: '00000000-0000-4000-8000-000000000099',
      },
    ],
    ['inactive result', { ...restoredWorkspaceRow, status: 'archived' }],
  ])('rejects an invalid %s', async (_label, data) => {
    const stub = makeWorkspaceCommandClientStub({ data, error: null });

    const result = await Effect.runPromise(
      restoreWorkspace(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceDataError');
    }
  });
});
