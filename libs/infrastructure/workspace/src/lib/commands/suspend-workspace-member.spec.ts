import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { SuspendWorkspaceMemberCommand } from '@chat-hub/application/workspace';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import {
  makeWorkspaceCommandClientStub,
  suspendedWorkspaceMemberRow,
} from '../testing';
import { suspendWorkspaceMember } from './suspend-workspace-member';

const command: SuspendWorkspaceMemberCommand = {
  workspaceId: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    suspendedWorkspaceMemberRow.workspace_id
  ),
  profileId: Schema.decodeUnknownSync(ProfileIdSchema)(
    suspendedWorkspaceMemberRow.user_id
  ),
  reason: null,
};

describe('suspendWorkspaceMember', () => {
  it('executes the RPC and validates the canonical suspended membership', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: suspendedWorkspaceMemberRow,
      error: null,
    });

    await Effect.runPromise(suspendWorkspaceMember(stub.client, command));

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith(
      'suspend_workspace_member',
      {
        p_workspace_id: command.workspaceId,
        p_user_id: command.profileId,
      }
    );
  });

  it('includes a present audit reason in the RPC arguments', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: suspendedWorkspaceMemberRow,
      error: null,
    });

    await Effect.runPromise(
      suspendWorkspaceMember(stub.client, {
        ...command,
        reason: 'Temporary access hold',
      })
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith(
      'suspend_workspace_member',
      {
        p_workspace_id: command.workspaceId,
        p_user_id: command.profileId,
        p_reason: 'Temporary access hold',
      }
    );
  });

  it.each([
    [
      'missing authorization',
      '28000',
      'Authentication is required to suspend a workspace member',
      'WorkspaceMemberSuspensionNotAllowedError',
    ],
    [
      'self-suspension',
      '55000',
      'Workspace owners cannot suspend themselves with this command',
      'WorkspaceMemberSuspensionNotAllowedError',
    ],
    [
      'non-owner actor',
      '42501',
      'Only an active workspace owner may suspend members',
      'WorkspaceMemberSuspensionNotAllowedError',
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
      'Only an active workspace member may be suspended',
      'WorkspaceMemberNotActiveError',
    ],
    [
      'last-owner suspension',
      '55000',
      'The last active workspace owner cannot be suspended',
      'WorkspaceLastOwnerSuspensionError',
    ],
  ])('maps %s to a typed failure', async (_label, code, message, tag) => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code, message },
    });

    const result = await Effect.runPromise(
      suspendWorkspaceMember(stub.client, command).pipe(Effect.either)
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
      suspendWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });

  it.each([
    ['missing result', null],
    [
      'active result',
      { ...suspendedWorkspaceMemberRow, membership_status: 'active' },
    ],
  ])('rejects an invalid %s', async (_label, data) => {
    const stub = makeWorkspaceCommandClientStub({ data, error: null });

    const result = await Effect.runPromise(
      suspendWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceMemberDataError');
    }
  });
});
