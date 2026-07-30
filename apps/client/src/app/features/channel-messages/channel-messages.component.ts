import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import type { ChannelId } from '@chat-hub/domain/channel';
import { ChannelMessageComposerComponent } from './composer/channel-message-composer.component';
import { ChannelMessageHistoryComponent } from './history/channel-message-history.component';
import { ChannelMessagesStore } from './channel-messages.store';

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

  private readonly store = inject(ChannelMessagesStore);

  constructor() {
    effect(() => {
      void this.store.selectChannel(this.channelId());
    });
  }
}
