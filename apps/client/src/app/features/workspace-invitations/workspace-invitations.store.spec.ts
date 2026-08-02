import { Either, Schema } from 'effect';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  WorkspaceInvitationAlreadyPendingError,
  WorkspaceInvitationResponseNotAllowedError,
  WorkspaceRepositoryUnavailableError,
  type PendingWorkspaceInvitation,
} from '@chat-hub/application/workspace';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
import {
  WorkspaceIdSchema,
  WorkspaceInvitationIdSchema,
  type Workspace,
  type WorkspaceInvitation,
} from '@chat-hub/domain/workspace';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';
import { WorkspaceInvitationsStore } from './workspace-invitations.store';

const workspace: Workspace = {
  id: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    '00000000-0000-4000-8000-000000000001'
  ),
  name: 'Chat Hub Development',
  slug: 'chat-hub-development',
  description: null,
};

const invitation: WorkspaceInvitation = {
  id: Schema.decodeUnknownSync(WorkspaceInvitationIdSchema)(
    '00000000-0000-4000-8000-000000000002'
  ),
  workspaceId: workspace.id,
  invitedProfileId: Schema.decodeUnknownSync(ProfileIdSchema)(
    '00000000-0000-4000-8000-000000000003'
  ),
  status: 'pending',
};

const pending: PendingWorkspaceInvitation = { invitation, workspace };

const configureStore = ({
  listResult = Either.right([pending]),
  inviteResult = Either.right(invitation),
  acceptResult = Either.right({
    workspaceId: workspace.id,
    profileId: invitation.invitedProfileId,
    role: 'member' as const,
  }),
  declineResult = Either.right(undefined),
} = {}) => {
  const service = {
    listPendingWorkspaceInvitations: vi.fn().mockResolvedValue(listResult),
    inviteWorkspaceMemberByUsername: vi.fn().mockResolvedValue(inviteResult),
    acceptWorkspaceInvitation: vi.fn().mockResolvedValue(acceptResult),
    declineWorkspaceInvitation: vi.fn().mockResolvedValue(declineResult),
  };

  TestBed.configureTestingModule({
    providers: [
      WorkspaceInvitationsStore,
      { provide: WorkspaceApplicationService, useValue: service },
    ],
  });

  return { store: TestBed.inject(WorkspaceInvitationsStore), service };
};

describe('WorkspaceInvitationsStore', () => {
  it('loads pending invitations once', async () => {
    const { store, service } = configureStore();

    const first = store.load();
    expect(store.load()).toBe(first);
    await first;

    expect(store.invitations()).toEqual([pending]);
    expect(store.loadStatus()).toBe('loaded');
    await store.load();
    expect(service.listPendingWorkspaceInvitations).toHaveBeenCalledOnce();
  });

  it('accepts, removes, and returns the joined workspace', async () => {
    const { store, service } = configureStore();
    await store.load();

    await expect(store.accept(invitation.id)).resolves.toEqual(workspace);

    expect(service.acceptWorkspaceInvitation).toHaveBeenCalledWith({
      invitationId: invitation.id,
    });
    expect(store.invitations()).toEqual([]);
  });

  it('removes a stale invitation when its response is no longer allowed', async () => {
    const failure = new WorkspaceInvitationResponseNotAllowedError({
      invitationId: invitation.id,
    });
    const { store } = configureStore({
      acceptResult: Either.left(failure),
    });
    await store.load();

    await expect(store.accept(invitation.id)).resolves.toBeNull();

    expect(store.invitations()).toEqual([]);
    expect(store.responseError()?.message).toContain('no longer pending');
  });

  it('declines and removes a pending invitation', async () => {
    const { store, service } = configureStore();
    await store.load();

    await expect(store.decline(invitation.id)).resolves.toBe(true);

    expect(service.declineWorkspaceInvitation).toHaveBeenCalledWith({
      invitationId: invitation.id,
    });
    expect(store.invitations()).toEqual([]);
  });

  it('maps creation failures without changing recipient invitations', async () => {
    const failure = new WorkspaceInvitationAlreadyPendingError({
      workspaceId: workspace.id,
      profileId: invitation.invitedProfileId,
    });
    const { store } = configureStore({ inviteResult: Either.left(failure) });
    await store.load();

    await expect(store.invite(workspace.id, 'candidate')).resolves.toBe(false);

    expect(store.creationError()).toEqual({
      message: 'That user already has a pending invitation.',
    });
    expect(store.invitations()).toEqual([pending]);
  });

  it('exposes a safe load failure and permits retry', async () => {
    const failure = new WorkspaceRepositoryUnavailableError({
      cause: 'offline',
    });
    const { store, service } = configureStore({
      listResult: Either.left(failure),
    });

    await store.load();
    expect(store.loadStatus()).toBe('failed');
    expect(store.error()?.message).toContain('currently unavailable');

    service.listPendingWorkspaceInvitations.mockResolvedValueOnce(
      Either.right([pending])
    );
    await store.load();
    expect(store.loadStatus()).toBe('loaded');
  });
});
