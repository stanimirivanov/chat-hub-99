import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
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

  private async selectChannelFromRoute(
    workspaceId: WorkspaceId,
    channelSlug: string | null
  ): Promise<void> {
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
