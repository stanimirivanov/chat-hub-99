import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { RemoveWorkspaceMemberCommand } from '@omoikane/application/workspace';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import {
  makeWorkspaceCommandClientStub,
  removedWorkspaceMemberRow,
} from '../testing';
import { removeWorkspaceMember } from './remove-workspace-member';

const command: RemoveWorkspaceMemberCommand = {
  workspaceId: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    removedWorkspaceMemberRow.workspace_id
  ),
  profileId: Schema.decodeUnknownSync(ProfileIdSchema)(
    removedWorkspaceMemberRow.user_id
  ),
  reason: null,
};

describe('removeWorkspaceMember', () => {
  it('executes the RPC and validates the canonical removed membership', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: removedWorkspaceMemberRow,
      error: null,
    });

    await Effect.runPromise(removeWorkspaceMember(stub.client, command));

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith(
      'remove_workspace_member',
      {
        p_workspace_id: command.workspaceId,
        p_user_id: command.profileId,
      }
    );
  });

  it('includes a present audit reason in the RPC arguments', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: removedWorkspaceMemberRow,
      error: null,
    });

    await Effect.runPromise(
      removeWorkspaceMember(stub.client, {
        ...command,
        reason: 'No longer participating',
      })
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith(
      'remove_workspace_member',
      {
        p_workspace_id: command.workspaceId,
        p_user_id: command.profileId,
        p_reason: 'No longer participating',
      }
    );
  });

  it.each([
    [
      'missing authorization',
      '28000',
      'Authentication is required to remove a workspace member',
      'WorkspaceMemberRemovalNotAllowedError',
    ],
    [
      'self-removal',
      '55000',
      'Workspace owners cannot remove themselves with this command',
      'WorkspaceMemberRemovalNotAllowedError',
    ],
    [
      'non-owner actor',
      '42501',
      'Only an active workspace owner may remove members',
      'WorkspaceMemberRemovalNotAllowedError',
    ],
    [
      'missing membership',
      'P0002',
      `User ${command.profileId} is not a member of workspace ${command.workspaceId}`,
      'WorkspaceMemberNotFoundError',
    ],
    [
      'inactive membership',
      '55000',
      'Only an active workspace member may be removed',
      'WorkspaceMemberNotActiveError',
    ],
    [
      'last-owner removal',
      '55000',
      'The last active workspace owner cannot be removed',
      'WorkspaceLastOwnerRemovalError',
    ],
  ])('maps %s to a typed failure', async (_label, code, message, tag) => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code, message },
    });

    const result = await Effect.runPromise(
      removeWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: tag,
        workspaceId: command.workspaceId,
      });
    }
  });

  it('does not misclassify an unrelated provider failure', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code: 'XX000', message: 'Unexpected provider failure' },
    });

    const result = await Effect.runPromise(
      removeWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });

  it('rejects a missing RPC result at the infrastructure boundary', async () => {
    const stub = makeWorkspaceCommandClientStub({ data: null, error: null });

    const result = await Effect.runPromise(
      removeWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceMemberDataError');
    }
  });

  it('rejects a non-removed canonical result', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: { ...removedWorkspaceMemberRow, membership_status: 'active' },
      error: null,
    });

    const result = await Effect.runPromise(
      removeWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceMemberDataError');
    }
  });
});
