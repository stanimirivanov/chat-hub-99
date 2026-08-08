import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { ChannelMessagesStore } from '../channel-messages.store';

@Component({
  selector: 'app-channel-message-composer',
  standalone: true,
  templateUrl: './channel-message-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelMessageComposerComponent {
  readonly typingActivity = output<void>();
  readonly typingStopped = output<void>();
  protected readonly store = inject(ChannelMessagesStore);

  protected async sendMessage(inputElement: HTMLInputElement): Promise<void> {
    this.typingStopped.emit();
    const sent = await this.store.send(inputElement.value);

    if (sent) {
      inputElement.value = '';
    }
  }
}
