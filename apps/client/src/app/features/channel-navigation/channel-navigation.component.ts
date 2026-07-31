import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import { ChannelMessagesComponent } from '@client/features/channel-messages/channel-messages.component';
import { ChannelNavigationStore } from './channel-navigation.store';

/**
 * Lists selectable channels for the workspace supplied by its parent.
 */
@Component({
  selector: 'app-channel-navigation',
  standalone: true,
  imports: [ChannelMessagesComponent],
  providers: [ChannelNavigationStore],
  templateUrl: './channel-navigation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelNavigationComponent {
  readonly workspaceId = input.required<WorkspaceId>();
  protected readonly store = inject(ChannelNavigationStore);
  protected readonly isCreatingChannel = signal(false);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  constructor() {
    effect(() => {
      const workspaceId = this.workspaceId();
      const channelSlug = this.queryParamMap().get('channel');
      void this.selectChannelFromRoute(workspaceId, channelSlug);
    });
  }

  /**
   * Writes channel selection to browser history.
   */
  protected navigateToChannel(channelSlug: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        channel: channelSlug,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected beginChannelCreation(): void {
    this.store.clearCreationError();
    this.isCreatingChannel.set(true);
  }

  protected cancelChannelCreation(): void {
    this.store.clearCreationError();
    this.isCreatingChannel.set(false);
  }

  protected async saveChannel(
    nameInput: HTMLInputElement,
    slugInput: HTMLInputElement,
    descriptionInput: HTMLTextAreaElement
  ): Promise<void> {
    const channel = await this.store.createChannel({
      name: nameInput.value,
      slug: slugInput.value,
      description: descriptionInput.value,
    });

    if (channel !== null) {
      this.isCreatingChannel.set(false);
      this.navigateToChannel(channel.slug);
    }
  }

  private async selectChannelFromRoute(
    workspaceId: WorkspaceId,
    channelSlug: string | null
  ): Promise<void> {
    if (this.store.workspaceId() !== workspaceId) {
      this.isCreatingChannel.set(false);
    }

    await this.store.load(workspaceId);

    if (
      this.workspaceId() !== workspaceId ||
      this.queryParamMap().get('channel') !== channelSlug
    ) {
      return;
    }

    if (channelSlug === null) {
      this.store.clearSelection();
      return;
    }

    if (this.store.loadStatus() !== 'loaded') {
      return;
    }

    const channel = this.store
      .channels()
      .find((candidate) => candidate.slug === channelSlug);

    if (channel !== undefined) {
      this.store.select(channel.id);
      return;
    }

    this.store.clearSelection();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        channel: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
