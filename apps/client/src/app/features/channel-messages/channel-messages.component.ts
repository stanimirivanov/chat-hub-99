import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import type { ChannelId } from '@omoikane/domain/channel';
import { ChannelMessageComposerComponent } from './composer/channel-message-composer.component';
import { ChannelMessageHistoryComponent } from './history/channel-message-history.component';
import { ChannelMessagesStore } from './channel-messages.store';

/** Coordinates one selected channel's message store and child views. */
@Component({
  selector: 'app-channel-messages',
  standalone: true,
  imports: [ChannelMessageHistoryComponent, ChannelMessageComposerComponent],
  templateUrl: './channel-messages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ChannelMessagesStore],
})
export class ChannelMessagesComponent {
  readonly channelId = input.required<ChannelId>();
  readonly canModerateMessages = input(false);

  private readonly store = inject(ChannelMessagesStore);

  constructor() {
    effect(() => {
      void this.store.selectChannel(this.channelId());
    });
  }
}
