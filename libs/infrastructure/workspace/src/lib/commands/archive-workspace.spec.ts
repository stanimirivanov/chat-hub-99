import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import {
  archivedWorkspaceRow,
  makeWorkspaceCommandClientStub,
} from '../testing';
import { archiveWorkspace } from './archive-workspace';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  archivedWorkspaceRow.workspace_id
);

describe('archiveWorkspace', () => {
  it('executes the RPC and acknowledges its validated archived result', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: archivedWorkspaceRow,
      error: null,
    });

    const result = await Effect.runPromise(
      archiveWorkspace(stub.client, workspaceId)
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('archive_workspace', {
      p_workspace_id: workspaceId,
    });
    expect(result).toBeUndefined();
  });

  it.each([
    [
      'authentication',
      {
        code: '28000',
        message: 'Authentication is required to archive a workspace',
      },
    ],
    [
      'owner authorization',
      {
        code: '42501',
        message: 'Only active workspace owners may archive the workspace',
      },
    ],
    ['missing workspace', { code: 'P0002', message: 'Workspace not found' }],
    [
      'already archived workspace',
      { code: '55000', message: 'Workspace is already archived' },
    ],
  ])('maps %s failure to archive-not-allowed', async (_label, error) => {
    const stub = makeWorkspaceCommandClientStub({ data: null, error });

    const result = await Effect.runPromise(
      archiveWorkspace(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'WorkspaceArchiveNotAllowedError',
        workspaceId,
      });
    }
  });

  it('does not misclassify an unrelated provider failure', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code: '55000', message: 'A different archive failure' },
    });

    const result = await Effect.runPromise(
      archiveWorkspace(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });

  it.each([
    ['missing result', null],
    [
      'mismatched identity',
      {
        ...archivedWorkspaceRow,
        workspace_id: '00000000-0000-4000-8000-000000000099',
      },
    ],
    ['active result', { ...archivedWorkspaceRow, status: 'active' }],
  ])('rejects an invalid %s at the adapter boundary', async (_label, data) => {
    const stub = makeWorkspaceCommandClientStub({ data, error: null });

    const result = await Effect.runPromise(
      archiveWorkspace(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceDataError');
    }
  });
});
