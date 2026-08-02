import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import {
  AvatarUrlSchema,
  ProfileIdSchema,
  type ProfileId,
} from '@chat-hub/domain/profile';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import { AuthenticationStore } from '@client/features/authentication/store/authentication.store';
import { WorkspaceMemberDirectoryComponent } from './workspace-member-directory.component';
import { WorkspaceMemberDirectoryStore } from './workspace-member-directory.store';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const ownerId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);
const memberId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000003'
);
const ownerAvatarUrl = Schema.decodeUnknownSync(AvatarUrlSchema)(
  'https://example.com/owner.png'
);

const renderComponent = async (currentProfileId: ProfileId) => {
  const store = {
    entries: signal([
      {
        profileId: ownerId,
        displayName: 'Workspace Owner',
        avatarUrl: ownerAvatarUrl,
        role: 'owner' as const,
      },
      {
        profileId: memberId,
        displayName: 'Workspace Member',
        avatarUrl: null,
        role: 'member' as const,
      },
    ]),
    isLoading: signal(false),
    hasMembers: signal(true),
    error: signal(null),
    mutationError: signal(null),
    additionError: signal(null),
    isMutatingMember: signal(false),
    isAddingMember: signal(false),
    isChangingRole: signal(false),
    isRemovingMember: signal(false),
    isSuspendingMember: signal(false),
    mutatingProfileId: signal(null),
    load: vi.fn().mockResolvedValue(undefined),
    changeMemberRole: vi.fn().mockResolvedValue(true),
    removeMember: vi.fn().mockResolvedValue(true),
    suspendMember: vi.fn().mockResolvedValue(true),
    addMemberByUsername: vi.fn().mockResolvedValue(true),
    clearMemberMutationError: vi.fn(),
    clearMemberAdditionError: vi.fn(),
  };

  TestBed.overrideComponent(WorkspaceMemberDirectoryComponent, {
    set: {
      providers: [
        {
          provide: WorkspaceMemberDirectoryStore,
          useValue: store,
        },
      ],
    },
  });

  await TestBed.configureTestingModule({
    imports: [WorkspaceMemberDirectoryComponent],
    providers: [
      {
        provide: AuthenticationStore,
        useValue: {
          session: signal({
            userId: currentProfileId,
            email: 'member@chat-hub.local',
          }),
        },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(WorkspaceMemberDirectoryComponent);
  const managementChanges: boolean[] = [];
  fixture.componentInstance.canManageMembersChange.subscribe((canManage) => {
    managementChanges.push(canManage);
  });
  fixture.componentRef.setInput('workspaceId', workspaceId);
  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, managementChanges, store };
};

describe('WorkspaceMemberDirectoryComponent', () => {
  it('loads the workspace and lets the current owner request a role change', async () => {
    const { fixture, managementChanges, store } =
      await renderComponent(ownerId);

    expect(store.load).toHaveBeenCalledExactlyOnceWith(workspaceId);
    expect(managementChanges).toContain(true);
    expect(
      (
        fixture.nativeElement.querySelector(
          'app-profile-avatar img'
        ) as HTMLImageElement
      ).src
    ).toBe(ownerAvatarUrl);
    expect(fixture.nativeElement.textContent).toContain(
      'Workspace Owner (you) — Owner'
    );

    const promoteButton = fixture.nativeElement.querySelector(
      'button[aria-label="Make owner: Workspace Member"]'
    ) as HTMLButtonElement;
    promoteButton.click();

    expect(store.changeMemberRole).toHaveBeenCalledExactlyOnceWith(
      memberId,
      'owner'
    );
  });

  it('does not offer role controls to a non-owner member', async () => {
    const { fixture, managementChanges } = await renderComponent(memberId);

    expect(fixture.nativeElement.textContent).toContain(
      'Workspace Member (you) — Member'
    );
    expect(managementChanges).toContain(false);
    expect(
      fixture.nativeElement.querySelectorAll('button[aria-label^="Make "]')
    ).toHaveLength(0);
    expect(
      fixture.nativeElement.querySelectorAll('button[aria-label^="Remove:"]')
    ).toHaveLength(0);
    expect(
      fixture.nativeElement.querySelectorAll('button[aria-label^="Suspend:"]')
    ).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('lets an owner add or reactivate a member by exact username', async () => {
    const { fixture, store } = await renderComponent(ownerId);
    const input = fixture.nativeElement.querySelector(
      'input[name="username"]'
    ) as HTMLInputElement;
    const form = input.closest('form') as HTMLFormElement;
    input.value = 'candidate';

    expect(fixture.nativeElement.textContent).toContain(
      'Add or reactivate member by username'
    );

    form.dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true })
    );
    await fixture.whenStable();

    expect(store.addMemberByUsername).toHaveBeenCalledExactlyOnceWith(
      'candidate'
    );
    expect(input.value).toBe('');
  });

  it('requires owner confirmation before requesting member removal', async () => {
    const { fixture, store } = await renderComponent(ownerId);
    const removeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Remove: Workspace Member"]'
    ) as HTMLButtonElement;

    removeButton.click();
    fixture.detectChanges();

    expect(store.removeMember).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Remove Workspace Member from this workspace?'
    );

    const confirmButton = fixture.nativeElement.querySelector(
      'button[aria-label="Confirm removal: Workspace Member"]'
    ) as HTMLButtonElement;
    confirmButton.click();

    expect(store.removeMember).toHaveBeenCalledExactlyOnceWith(memberId);
  });

  it('requires owner confirmation before suspending a member', async () => {
    const { fixture, store } = await renderComponent(ownerId);
    const suspendButton = fixture.nativeElement.querySelector(
      'button[aria-label="Suspend: Workspace Member"]'
    ) as HTMLButtonElement;

    suspendButton.click();
    fixture.detectChanges();

    expect(store.suspendMember).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'Suspend Workspace Member? They will lose workspace access until an owner reactivates them.'
    );

    const confirmButton = fixture.nativeElement.querySelector(
      'button[aria-label="Confirm suspension: Workspace Member"]'
    ) as HTMLButtonElement;
    confirmButton.click();

    expect(store.suspendMember).toHaveBeenCalledExactlyOnceWith(memberId);
  });
});
