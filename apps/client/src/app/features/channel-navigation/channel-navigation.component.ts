import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
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

  constructor() {
    effect(() => {
      void this.store.load(this.workspaceId());
    });
  }
}
