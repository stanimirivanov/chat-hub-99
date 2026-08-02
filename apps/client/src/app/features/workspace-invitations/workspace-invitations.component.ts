import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import type {
  Workspace,
  WorkspaceId,
  WorkspaceInvitationId,
} from '@chat-hub/domain/workspace';
import { WorkspaceInvitationsStore } from './workspace-invitations.store';

/** Presents recipient consent and selected-owner invitation creation. */
@Component({
  selector: 'app-workspace-invitations',
  standalone: true,
  providers: [WorkspaceInvitationsStore],
  templateUrl: './workspace-invitations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceInvitationsComponent {
  readonly workspaceId = input<WorkspaceId | null>(null);
  readonly canInvite = input(false);
  readonly invitationAccepted = output<Workspace>();
  protected readonly store = inject(WorkspaceInvitationsStore);

  constructor() {
    void this.store.load();
  }

  protected async invite(
    event: SubmitEvent,
    workspaceId: WorkspaceId,
    usernameInput: HTMLInputElement
  ): Promise<void> {
    event.preventDefault();

    if (await this.store.invite(workspaceId, usernameInput.value)) {
      usernameInput.value = '';
    }
  }

  protected async accept(invitationId: WorkspaceInvitationId): Promise<void> {
    const workspace = await this.store.accept(invitationId);

    if (workspace !== null) {
      this.invitationAccepted.emit(workspace);
    }
  }

  protected decline(invitationId: WorkspaceInvitationId): void {
    void this.store.decline(invitationId);
  }
}
