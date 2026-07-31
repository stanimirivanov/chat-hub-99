import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
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

describe('WorkspaceMemberDirectoryComponent', () => {
  it('loads the workspace and identifies the current member', async () => {
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
      load: vi.fn().mockResolvedValue(undefined),
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
              userId: memberId,
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

    expect(store.load).toHaveBeenCalledExactlyOnceWith(workspaceId);
    expect(fixture.nativeElement.textContent).toContain(
      'Workspace Owner — Owner'
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Workspace Member (you) — Member'
    );
  });
});
