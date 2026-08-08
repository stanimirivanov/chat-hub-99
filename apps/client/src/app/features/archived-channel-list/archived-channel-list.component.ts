import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import type { Channel } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import { ArchivedChannelListStore } from './archived-channel-list.store';

/** Presents owner-only archived-channel history without restoration actions. */
@Component({
  selector: 'app-archived-channel-list',
  standalone: true,
  imports: [DatePipe],
  providers: [ArchivedChannelListStore],
  templateUrl: './archived-channel-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivedChannelListComponent {
  readonly workspaceId = input.required<WorkspaceId>();
  readonly activeChannels = input.required<readonly Channel[]>();
  protected readonly store = inject(ArchivedChannelListStore);
  private activeIdentitySnapshot: string | null = null;

  constructor() {
    effect(() => {
      const workspaceId = this.workspaceId();
      const identitySnapshot = `${workspaceId}:${this.activeChannels()
        .map((channel) => channel.id)
        .sort()
        .join(',')}`;

      if (identitySnapshot === this.activeIdentitySnapshot) {
        return;
      }

      const force = this.store.workspaceId() === workspaceId;
      this.activeIdentitySnapshot = identitySnapshot;
      void this.store.load(workspaceId, force);
    });
  }
}
