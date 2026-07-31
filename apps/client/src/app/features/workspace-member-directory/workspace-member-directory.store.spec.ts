import { Either, Schema } from 'effect';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ProfileRepositoryUnavailableError } from '@chat-hub/application/profile';
import { WorkspaceRepositoryUnavailableError } from '@chat-hub/application/workspace';
import { ProfileIdSchema, type Profile } from '@chat-hub/domain/profile';
import {
  WorkspaceIdSchema,
  type WorkspaceMember,
} from '@chat-hub/domain/workspace';
import { ProfileApplicationService } from '@client/core/profile/profile-application.service';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';
import { WorkspaceMemberDirectoryStore } from './workspace-member-directory.store';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const nextWorkspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);
const ownerId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000003'
);
const memberId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000004'
);

const owner: WorkspaceMember = {
  workspaceId,
  profileId: ownerId,
  role: 'owner',
};
const member: WorkspaceMember = {
  workspaceId,
  profileId: memberId,
  role: 'member',
};
const profiles: readonly Profile[] = [
  {
    id: memberId,
    username: 'member',
    displayName: 'Alpha Member',
    avatarUrl: null,
    status: 'active',
  },
  {
    id: ownerId,
    username: 'owner',
    displayName: 'Workspace Owner',
    avatarUrl: null,
    status: 'active',
  },
];

const configureStore = (
  listWorkspaceMembers = vi
    .fn()
    .mockResolvedValue(Either.right([member, owner])),
  listCurrentProfiles = vi.fn().mockResolvedValue(Either.right(profiles))
) => {
  TestBed.configureTestingModule({
    providers: [
      WorkspaceMemberDirectoryStore,
      {
        provide: WorkspaceApplicationService,
        useValue: { listWorkspaceMembers },
      },
      {
        provide: ProfileApplicationService,
        useValue: { listCurrentProfiles },
      },
    ],
  });

  return {
    store: TestBed.inject(WorkspaceMemberDirectoryStore),
    listWorkspaceMembers,
    listCurrentProfiles,
  };
};

describe('WorkspaceMemberDirectoryStore', () => {
  it('loads once, batch-enriches profiles, and displays owners first', async () => {
    const { store, listWorkspaceMembers, listCurrentProfiles } =
      configureStore();

    const firstLoad = store.load(workspaceId);
    expect(store.load(workspaceId)).toBe(firstLoad);
    await firstLoad;

    expect(listWorkspaceMembers).toHaveBeenCalledExactlyOnceWith(workspaceId);
    expect(listCurrentProfiles).toHaveBeenCalledExactlyOnceWith([
      memberId,
      ownerId,
    ]);
    expect(store.entries()).toEqual([
      {
        profileId: ownerId,
        displayName: 'Workspace Owner',
        role: 'owner',
      },
      {
        profileId: memberId,
        displayName: 'Alpha Member',
        role: 'member',
      },
    ]);

    await store.load(workspaceId);
    expect(listWorkspaceMembers).toHaveBeenCalledOnce();
  });

  it('exposes a safe membership error and permits retry', async () => {
    const failure = new WorkspaceRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    });
    const listWorkspaceMembers = vi
      .fn()
      .mockResolvedValueOnce(Either.left(failure))
      .mockResolvedValueOnce(Either.right([owner]));
    const { store, listCurrentProfiles } = configureStore(listWorkspaceMembers);

    await store.load(workspaceId);

    expect(store.loadStatus()).toBe('failed');
    expect(store.error()).toEqual({
      message: 'Workspace members are currently unavailable. Please try again.',
    });
    expect(listCurrentProfiles).not.toHaveBeenCalled();

    await store.load(workspaceId);
    expect(store.loadStatus()).toBe('loaded');
  });

  it('retains roles with fallback names when profile enrichment fails', async () => {
    const profileFailure = new ProfileRepositoryUnavailableError({
      cause: new Error('Profiles unavailable'),
    });
    const listCurrentProfiles = vi
      .fn()
      .mockResolvedValue(Either.left(profileFailure));
    const { store } = configureStore(undefined, listCurrentProfiles);

    await store.load(workspaceId);

    expect(store.loadStatus()).toBe('loaded');
    expect(store.error()).toBeNull();
    expect(store.entries()).toEqual([
      {
        profileId: ownerId,
        displayName: 'Another member',
        role: 'owner',
      },
      {
        profileId: memberId,
        displayName: 'Another member',
        role: 'member',
      },
    ]);
  });

  it('ignores a stale membership result after the workspace changes', async () => {
    let resolveFirst:
      | ((result: Either.Either<readonly WorkspaceMember[], never>) => void)
      | undefined;
    const firstResult = new Promise<
      Either.Either<readonly WorkspaceMember[], never>
    >((resolve) => {
      resolveFirst = resolve;
    });
    const nextMember: WorkspaceMember = {
      workspaceId: nextWorkspaceId,
      profileId: memberId,
      role: 'member',
    };
    const listWorkspaceMembers = vi
      .fn()
      .mockReturnValueOnce(firstResult)
      .mockResolvedValueOnce(Either.right([nextMember]));
    const { store } = configureStore(listWorkspaceMembers);

    const oldLoad = store.load(workspaceId);
    await store.load(nextWorkspaceId);
    resolveFirst?.(Either.right([owner]));
    await oldLoad;

    expect(store.workspaceId()).toBe(nextWorkspaceId);
    expect(store.members()).toEqual([nextMember]);
  });
});
