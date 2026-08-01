import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ProfileIdSchema, type ProfileId } from '@chat-hub/domain/profile';
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

const renderComponent = async (currentProfileId: ProfileId) => {
  const store = {
    entries: signal([
      {
        profileId: ownerId,
        displayName: 'Workspace Owner',
        role: 'owner' as const,
      },
      {
        profileId: memberId,
        displayName: 'Workspace Member',
        role: 'member' as const,
      },
    ]),
    isLoading: signal(false),
    hasMembers: signal(true),
    error: signal(null),
    mutationError: signal(null),
    isMutatingMember: signal(false),
    isChangingRole: signal(false),
    isRemovingMember: signal(false),
    mutatingProfileId: signal(null),
    load: vi.fn().mockResolvedValue(undefined),
    changeMemberRole: vi.fn().mockResolvedValue(true),
    removeMember: vi.fn().mockResolvedValue(true),
    clearMemberMutationError: vi.fn(),
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
  fixture.componentRef.setInput('workspaceId', workspaceId);
  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, store };
};

describe('WorkspaceMemberDirectoryComponent', () => {
  it('loads the workspace and lets the current owner request a role change', async () => {
    const { fixture, store } = await renderComponent(ownerId);

    expect(store.load).toHaveBeenCalledExactlyOnceWith(workspaceId);
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
    const { fixture } = await renderComponent(memberId);

    expect(fixture.nativeElement.textContent).toContain(
      'Workspace Member (you) — Member'
    );
    expect(
      fixture.nativeElement.querySelectorAll('button[aria-label^="Make "]')
    ).toHaveLength(0);
    expect(
      fixture.nativeElement.querySelectorAll('button[aria-label^="Remove:"]')
    ).toHaveLength(0);
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
});
