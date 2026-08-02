import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ProfileIdSchema } from '@chat-hub/domain/profile';
import {
  WorkspaceIdSchema,
  WorkspaceInvitationIdSchema,
  type Workspace,
} from '@chat-hub/domain/workspace';
import { WorkspaceInvitationsComponent } from './workspace-invitations.component';
import { WorkspaceInvitationsStore } from './workspace-invitations.store';

const workspace: Workspace = {
  id: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    '00000000-0000-4000-8000-000000000001'
  ),
  name: 'Chat Hub Development',
  slug: 'chat-hub-development',
  description: null,
};

const invitationId = Schema.decodeUnknownSync(WorkspaceInvitationIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);

const renderComponent = async () => {
  const store = {
    invitations: signal([
      {
        invitation: {
          id: invitationId,
          workspaceId: workspace.id,
          invitedProfileId: Schema.decodeUnknownSync(ProfileIdSchema)(
            '00000000-0000-4000-8000-000000000003'
          ),
          status: 'pending' as const,
        },
        workspace,
      },
    ]),
    loadStatus: signal('loaded'),
    creationStatus: signal('idle'),
    responseKind: signal(null),
    respondingInvitationId: signal(null),
    error: signal(null),
    creationError: signal(null),
    responseError: signal(null),
    isLoading: signal(false),
    isCreating: signal(false),
    isResponding: signal(false),
    hasInvitations: signal(true),
    ownerError: signal(null),
    cancellationError: signal(null),
    managedInvitations: signal([
      {
        invitation: {
          id: invitationId,
          workspaceId: workspace.id,
          invitedProfileId: Schema.decodeUnknownSync(ProfileIdSchema)(
            '00000000-0000-4000-8000-000000000003'
          ),
          status: 'pending' as const,
        },
        username: 'candidate',
      },
    ]),
    isOwnerLoading: signal(false),
    isCancelling: signal(false),
    isMutatingOwnerInvitations: signal(false),
    hasManagedInvitations: signal(true),
    load: vi.fn().mockResolvedValue(undefined),
    loadManagedInvitations: vi.fn().mockResolvedValue(undefined),
    invite: vi.fn().mockResolvedValue(true),
    accept: vi.fn().mockResolvedValue(workspace),
    decline: vi.fn().mockResolvedValue(true),
    cancel: vi.fn().mockResolvedValue(true),
    clearCreationFeedback: vi.fn(),
    clearResponseError: vi.fn(),
    clearCancellationError: vi.fn(),
  };

  TestBed.overrideComponent(WorkspaceInvitationsComponent, {
    set: {
      providers: [{ provide: WorkspaceInvitationsStore, useValue: store }],
    },
  });
  await TestBed.configureTestingModule({
    imports: [WorkspaceInvitationsComponent],
  }).compileComponents();

  const fixture = TestBed.createComponent(WorkspaceInvitationsComponent);
  fixture.componentRef.setInput('workspaceId', workspace.id);
  fixture.componentRef.setInput('canInvite', true);
  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, store };
};

describe('WorkspaceInvitationsComponent', () => {
  it('loads invitations and lets a selected owner invite by exact username', async () => {
    const { fixture, store } = await renderComponent();
    const input = fixture.nativeElement.querySelector(
      'input[name="username"]'
    ) as HTMLInputElement;
    input.value = 'candidate';
    input
      .closest('form')
      ?.dispatchEvent(
        new SubmitEvent('submit', { bubbles: true, cancelable: true })
      );
    await fixture.whenStable();

    expect(store.load).toHaveBeenCalledOnce();
    expect(store.loadManagedInvitations).toHaveBeenCalledWith(workspace.id);
    expect(store.invite).toHaveBeenCalledWith(workspace.id, 'candidate');
    expect(input.value).toBe('');
  });

  it('emits the joined workspace after acceptance', async () => {
    const { fixture, store } = await renderComponent();
    const accepted: Workspace[] = [];
    fixture.componentInstance.invitationAccepted.subscribe((value) =>
      accepted.push(value)
    );

    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Accept invitation to Chat Hub Development"]'
    ) as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(store.accept).toHaveBeenCalledWith(invitationId);
    expect(accepted).toEqual([workspace]);
  });

  it('requires confirmation before cancelling an owner-managed invitation', async () => {
    const { fixture, store } = await renderComponent();
    const requestButton = fixture.nativeElement.querySelector(
      'button[aria-label="Cancel invitation for candidate"]'
    ) as HTMLButtonElement;

    requestButton.click();
    fixture.detectChanges();

    const confirmButton = fixture.nativeElement.querySelector(
      'button[aria-label="Confirm cancellation for candidate"]'
    ) as HTMLButtonElement;
    confirmButton.click();
    await fixture.whenStable();

    expect(store.cancel).toHaveBeenCalledWith(invitationId);
  });
});
