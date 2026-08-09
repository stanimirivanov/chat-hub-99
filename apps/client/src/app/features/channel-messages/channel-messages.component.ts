import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import type { ChannelId } from '@omoikane/domain/channel';
import type { MessageId } from '@omoikane/domain/message';
import { ChannelMessageComposerComponent } from './composer/channel-message-composer.component';
import { ChannelMessageHistoryComponent } from './history/channel-message-history.component';
import { ChannelMessagesStore } from './channel-messages.store';
import { ChannelTypingStore } from '@client/features/channel-typing/channel-typing.store';

/** Coordinates one selected channel's message store and child views. */
@Component({
  selector: 'app-channel-messages',
  standalone: true,
  imports: [ChannelMessageHistoryComponent, ChannelMessageComposerComponent],
  templateUrl: './channel-messages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ChannelMessagesStore, ChannelTypingStore],
})
export class ChannelMessagesComponent {
  readonly channelId = input.required<ChannelId>();
  readonly focusedMessageId = input<MessageId | null>(null);
  readonly canModerateMessages = input(false);

  private readonly store = inject(ChannelMessagesStore);
  protected readonly typingStore = inject(ChannelTypingStore);

  constructor() {
    effect(() => {
      void this.store.selectChannel(this.channelId());
      this.typingStore.connect(this.channelId());
    });

    effect(() => {
      void this.store.selectFocusedMessage(
        this.channelId(),
        this.focusedMessageId()
      );
    });
  }
}
