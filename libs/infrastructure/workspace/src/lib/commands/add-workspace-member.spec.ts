import { Effect, Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import type { AddWorkspaceMemberCommand } from '@chat-hub/application/workspace';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import {
  addedWorkspaceMemberRow,
  makeWorkspaceCommandClientStub,
} from '../testing';
import { addWorkspaceMember } from './add-workspace-member';

const command: AddWorkspaceMemberCommand = {
  workspaceId: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    addedWorkspaceMemberRow.workspace_id
  ),
  profileId: Schema.decodeUnknownSync(ProfileIdSchema)(
    addedWorkspaceMemberRow.user_id
  ),
};

describe('addWorkspaceMember', () => {
  it('executes the RPC and returns its validated active-member projection', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: addedWorkspaceMemberRow,
      error: null,
    });

    const result = await Effect.runPromise(
      addWorkspaceMember(stub.client, command)
    );

    expect(stub.rpc).toHaveBeenCalledExactlyOnceWith('add_workspace_member', {
      p_workspace_id: command.workspaceId,
      p_user_id: command.profileId,
    });
    expect(result).toEqual({
      workspaceId: command.workspaceId,
      profileId: command.profileId,
      role: 'member',
    });
  });

  it.each([
    [
      'missing authorization',
      '28000',
      'Authentication is required to add a workspace member',
      'WorkspaceMemberAdditionNotAllowedError',
    ],
    [
      'non-owner actor',
      '42501',
      'Only an active workspace owner may add members',
      'WorkspaceMemberAdditionNotAllowedError',
    ],
    [
      'inactive profile',
      '55000',
      `User ${command.profileId} does not have an active profile`,
      'WorkspaceMemberProfileNotActiveError',
    ],
    [
      'already-active membership',
      '55000',
      `User ${command.profileId} is already an active workspace member`,
      'WorkspaceMemberAlreadyActiveError',
    ],
    [
      'non-reactivatable membership',
      '55000',
      'Only left, removed, or suspended memberships may be reinstated',
      'WorkspaceMemberReactivationNotAllowedError',
    ],
  ])('maps %s to a typed failure', async (_label, code, message, tag) => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code, message },
    });

    const result = await Effect.runPromise(
      addWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: tag,
        workspaceId: command.workspaceId,
      });
    }
  });

  it('does not misclassify an unrelated uniqueness failure', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: null,
      error: { code: '23505', message: 'Unrelated unique constraint' },
    });

    const result = await Effect.runPromise(
      addWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
  });

  it('rejects a missing RPC result at the infrastructure boundary', async () => {
    const stub = makeWorkspaceCommandClientStub({ data: null, error: null });

    const result = await Effect.runPromise(
      addWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceMemberDataError');
    }
  });

  it('rejects a non-member canonical role', async () => {
    const stub = makeWorkspaceCommandClientStub({
      data: { ...addedWorkspaceMemberRow, membership_role: 'owner' },
      error: null,
    });

    const result = await Effect.runPromise(
      addWorkspaceMember(stub.client, command).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceMemberDataError');
    }
  });
});
