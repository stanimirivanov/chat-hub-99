import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChannelMessagesStore } from '../channel-messages.store';

@Component({
  selector: 'app-channel-message-composer',
  standalone: true,
  templateUrl: './channel-message-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelMessageComposerComponent {
  protected readonly store = inject(ChannelMessagesStore);

  protected async sendMessage(inputElement: HTMLInputElement): Promise<void> {
    const sent = await this.store.send(inputElement.value);

    if (sent) {
      inputElement.value = '';
    }
  }
}
