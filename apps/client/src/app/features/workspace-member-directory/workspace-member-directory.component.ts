import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
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
  protected readonly store = inject(WorkspaceMemberDirectoryStore);
  private readonly authenticationStore = inject(AuthenticationStore);

  /**
   * Owner status is a presentation affordance only. The RPC independently
   * authorizes the current provider session before changing a role.
   */
  protected readonly canChangeRoles = computed(() => {
    const currentProfileId = this.authenticationStore.session()?.userId;

    return this.store
      .entries()
      .some(
        (entry) =>
          entry.profileId === currentProfileId && entry.role === 'owner'
      );
  });

  constructor() {
    effect(() => {
      void this.store.load(this.workspaceId());
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
}
