import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { ProfileId } from '@chat-hub/domain/profile';
import type {
  WorkspaceId,
  WorkspaceMemberRole,
} from '@chat-hub/domain/workspace';
import { AuthenticationStore } from '@client/features/authentication/store/authentication.store';
import { WorkspaceMemberDirectoryStore } from './workspace-member-directory.store';

/**
 * Displays active workspace members and their current roles.
 */
@Component({
  selector: 'app-workspace-member-directory',
  standalone: true,
  providers: [WorkspaceMemberDirectoryStore],
  templateUrl: './workspace-member-directory.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceMemberDirectoryComponent {
  readonly workspaceId = input.required<WorkspaceId>();

  /**
   * Shares the directory's derived owner affordance without exposing its store.
   * Database commands still authorize every management action independently.
   */
  readonly canManageMembersChange = output<boolean>();
  protected readonly store = inject(WorkspaceMemberDirectoryStore);
  private readonly authenticationStore = inject(AuthenticationStore);

  /**
   * Owner status is a presentation affordance only. Membership RPCs
   * independently authorize the current provider session.
   */
  protected readonly canManageMembers = computed(() => {
    const currentProfileId = this.authenticationStore.session()?.userId;

    return this.store
      .entries()
      .some(
        (entry) =>
          entry.profileId === currentProfileId && entry.role === 'owner'
      );
  });
  protected readonly pendingRemovalProfileId = signal<ProfileId | null>(null);

  constructor() {
    effect(() => {
      const workspaceId = this.workspaceId();
      this.pendingRemovalProfileId.set(null);
      void this.store.load(workspaceId);
    });

    effect(() => {
      this.canManageMembersChange.emit(this.canManageMembers());
    });
  }

  protected isCurrentUser(profileId: ProfileId): boolean {
    return this.authenticationStore.session()?.userId === profileId;
  }

  protected changeRole(
    profileId: ProfileId,
    currentRole: WorkspaceMemberRole
  ): void {
    void this.store.changeMemberRole(
      profileId,
      currentRole === 'owner' ? 'member' : 'owner'
    );
  }

  protected async addMember(
    event: SubmitEvent,
    usernameInput: HTMLInputElement
  ): Promise<void> {
    event.preventDefault();

    if (await this.store.addMemberByUsername(usernameInput.value)) {
      usernameInput.value = '';
    }
  }

  protected requestRemoval(profileId: ProfileId): void {
    this.pendingRemovalProfileId.set(profileId);
  }

  protected cancelRemoval(): void {
    this.pendingRemovalProfileId.set(null);
  }

  protected confirmRemoval(profileId: ProfileId): void {
    this.pendingRemovalProfileId.set(null);
    void this.store.removeMember(profileId);
  }
}
