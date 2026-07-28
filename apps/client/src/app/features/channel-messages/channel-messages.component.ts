import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import type { ChannelId } from '@chat-hub/domain/message';

import { ChannelMessagesStore } from './channel-messages.store';

@Component({
  selector: 'app-channel-messages',
  standalone: true,
  templateUrl: './channel-messages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ChannelMessagesStore],
})
export class ChannelMessagesComponent {
  readonly channelId = input.required<ChannelId>();

  protected readonly store = inject(ChannelMessagesStore);

  constructor() {
    effect(() => {
      void this.store.selectChannel(this.channelId());
    });
  }

  protected async sendMessage(
    inputElement: HTMLInputElement
  ): Promise<void> {
    const sent = await this.store.send(inputElement.value);

    if (sent) {
      inputElement.value = '';
    }
  }
}
