import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ChannelNavigationComponent } from '@client/features/channel-navigation/channel-navigation.component';
import { WorkspaceMemberDirectoryComponent } from '@client/features/workspace-member-directory/workspace-member-directory.component';
import { WorkspaceNavigationStore } from './workspace-navigation.store';

/**
 * Lists accessible workspaces and owns one feature-scoped selection store.
 */
@Component({
  selector: 'app-workspace-navigation',
  standalone: true,
  imports: [ChannelNavigationComponent, WorkspaceMemberDirectoryComponent],
  providers: [WorkspaceNavigationStore],
  templateUrl: './workspace-navigation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceNavigationComponent {
  protected readonly store = inject(WorkspaceNavigationStore);
  protected readonly isCreatingWorkspace = signal(false);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  constructor() {
    effect(() => {
      const workspaceSlug = this.queryParamMap().get('workspace');
      void this.selectWorkspaceFromRoute(workspaceSlug);
    });
  }

  /**
   * Writes workspace selection to browser history.
   *
   * Selecting another workspace also clears the channel parameter because a
   * channel slug is meaningful only inside its owning workspace.
   */
  protected navigateToWorkspace(workspaceSlug: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        workspace: workspaceSlug,
        channel: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected beginWorkspaceCreation(): void {
    this.store.clearCreationError();
    this.isCreatingWorkspace.set(true);
  }

  protected cancelWorkspaceCreation(): void {
    this.store.clearCreationError();
    this.isCreatingWorkspace.set(false);
  }

  protected async saveWorkspace(
    nameInput: HTMLInputElement,
    slugInput: HTMLInputElement,
    descriptionInput: HTMLTextAreaElement
  ): Promise<void> {
    const workspace = await this.store.createWorkspace({
      name: nameInput.value,
      slug: slugInput.value,
      description: descriptionInput.value,
    });

    if (workspace !== null) {
      this.isCreatingWorkspace.set(false);
      this.navigateToWorkspace(workspace.slug);
    }
  }

  private async selectWorkspaceFromRoute(
    workspaceSlug: string | null
  ): Promise<void> {
    await this.store.load();

    if (this.queryParamMap().get('workspace') !== workspaceSlug) {
      return;
    }

    if (workspaceSlug === null) {
      this.store.clearSelection();
      return;
    }

    if (this.store.loadStatus() !== 'loaded') {
      return;
    }

    const workspace = this.store
      .workspaces()
      .find((candidate) => candidate.slug === workspaceSlug);

    if (workspace !== undefined) {
      this.store.select(workspace.id);
      return;
    }

    this.store.clearSelection();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        workspace: null,
        channel: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
