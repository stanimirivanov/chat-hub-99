import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { leftWorkspaceRow, makeWorkspaceCommandClientStub } from '../testing';
import { leaveWorkspace } from './leave-workspace';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  leftWorkspaceRow.workspace_id
);

describe('leaveWorkspace', () => {
  it('executes the session-derived RPC and validates its result', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: leftWorkspaceRow,
      error: null,
    });

    await Effect.runPromise(leaveWorkspace(stub.client, workspaceId));

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('leave_workspace', {
      p_workspace_id: workspaceId,
    });
  });

  it.each([
    [
      'missing authentication',
      '28000',
      'Authentication is required to leave a workspace',
      'WorkspaceDepartureNotAllowedError',
    ],
    [
      'missing workspace',
      'P0002',
      `Workspace ${workspaceId} does not exist`,
      'WorkspaceDepartureNotAllowedError',
    ],
    [
      'inactive workspace',
      '55000',
      `Workspace ${workspaceId} is not active`,
      'WorkspaceDepartureNotAllowedError',
    ],
    [
      'missing membership',
      'P0002',
      `Authenticated user is not a member of workspace ${workspaceId}`,
      'WorkspaceDepartureNotAllowedError',
    ],
    [
      'inactive membership',
      '55000',
      'Only active workspace members may leave',
      'WorkspaceDepartureNotAllowedError',
    ],
    [
      'last-owner departure',
      '55000',
      'The last active workspace owner cannot leave the workspace',
      'WorkspaceLastOwnerDepartureError',
    ],
  ])('maps %s to a typed failure', async (_label, code, message, tag) => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code, message },
    });

    const result = await Effect.runPromise(
      leaveWorkspace(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({ _tag: tag, workspaceId });
    }
  });

  it('does not misclassify an unrelated provider failure', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code: 'XX000', message: 'Unexpected provider failure' },
    });

    const result = await Effect.runPromise(
      leaveWorkspace(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });

  it.each([
    ['missing result', null],
    [
      'mismatched workspace',
      {
        ...leftWorkspaceRow,
        workspace_id: '00000000-0000-4000-8000-000000000099',
      },
    ],
    ['active membership', { ...leftWorkspaceRow, membership_status: 'active' }],
    [
      'owner-removed membership',
      { ...leftWorkspaceRow, membership_status: 'removed' },
    ],
  ])('rejects an invalid %s at the adapter boundary', async (_label, data) => {
    const stub = makeWorkspaceCommandClientStub({ data, error: null });

    const result = await Effect.runPromise(
      leaveWorkspace(stub.client, workspaceId).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceMemberDataError');
    }
  });
});
