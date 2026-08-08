import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { ChangeWorkspaceMemberRoleCommand } from '@omoikane/application/workspace';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import {
  WorkspaceIdSchema,
  WorkspaceMemberRoleSchema,
} from '@omoikane/domain/workspace';
import {
  changedWorkspaceMemberRoleRow,
  makeWorkspaceCommandClientStub,
} from '../testing';
import { changeWorkspaceMemberRole } from './change-workspace-member-role';

const command: ChangeWorkspaceMemberRoleCommand = {
  workspaceId: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    changedWorkspaceMemberRoleRow.workspace_id
  ),
  profileId: Schema.decodeUnknownSync(ProfileIdSchema)(
    changedWorkspaceMemberRoleRow.user_id
  ),
  role: Schema.decodeUnknownSync(WorkspaceMemberRoleSchema)(
    changedWorkspaceMemberRoleRow.membership_role
  ),
};

describe('changeWorkspaceMemberRole', () => {
  it('executes the RPC and returns its validated canonical membership', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: changedWorkspaceMemberRoleRow,
      error: null,
    });

    const result = await Effect.runPromise(
      changeWorkspaceMemberRole(stub.client, command)
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith(
      'change_workspace_member_role',
      {
        p_workspace_id: command.workspaceId,
        p_user_id: command.profileId,
        p_role: 'owner',
      }
    );
    expect(result).toEqual({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
      role: 'owner',
    });
  });

  it.each([
    [
      'missing authorization',
      '28000',
      'Authentication is required to change a workspace member role',
      'WorkspaceMemberRoleChangeNotAllowedError',
    ],
    [
      'non-owner actor',
      '42501',
      'Only an active workspace owner may change member roles',
      'WorkspaceMemberRoleChangeNotAllowedError',
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
      'Only active workspace memberships may change role',
      'WorkspaceMemberNotActiveError',
    ],
    [
      'unchanged role',
      '55000',
      'Workspace member already has role owner',
      'WorkspaceMemberRoleUnchangedError',
    ],
    [
      'last-owner demotion',
      '55000',
      'The last active workspace owner cannot be demoted',
      'WorkspaceLastOwnerDemotionError',
    ],
  ])('maps %s to %s', async (_label, code, message, tag) => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code, message },
    });

    const result = await Effect.runPromise(
      changeWorkspaceMemberRole(stub.client, command).pipe(Effect.either)
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
      changeWorkspaceMemberRole(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });

  it('rejects a missing RPC result at the infrastructure boundary', async () => {
    const stub = makeWorkspaceCommandClientStub({ data: null, error: null });

    const result = await Effect.runPromise(
      changeWorkspaceMemberRole(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceMemberDataError');
    }
  });

  it('rejects a non-active canonical result at the infrastructure boundary', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: {
        ...changedWorkspaceMemberRoleRow,
        membership_status: 'removed',
      },
      error: null,
    });

    const result = await Effect.runPromise(
      changeWorkspaceMemberRole(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceMemberDataError');
    }
  });
});
