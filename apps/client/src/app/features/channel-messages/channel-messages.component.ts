import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import type { ChannelId, MessageId } from '@chat-hub/domain/message';
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

  protected readonly editingMessageId = signal<MessageId | null>(null);

  protected readonly deletingMessageId = signal<MessageId | null>(null);

  constructor() {
    effect(() => {
      this.editingMessageId.set(null);
      this.deletingMessageId.set(null);
      void this.store.selectChannel(this.channelId());
    });
  }

  protected async sendMessage(inputElement: HTMLInputElement): Promise<void> {
    const sent = await this.store.send(inputElement.value);

    if (sent) {
      inputElement.value = '';
    }
  }

  protected beginEdit(messageId: MessageId): void {
    this.store.clearEditError();
    this.editingMessageId.set(messageId);
  }

  protected cancelEdit(): void {
    this.store.clearEditError();
    this.editingMessageId.set(null);
  }

  protected async saveEdit(
    messageId: MessageId,
    inputElement: HTMLInputElement
  ): Promise<void> {
    const edited = await this.store.edit(messageId, inputElement.value);

    if (edited) {
      this.editingMessageId.set(null);
    }
  }

  protected async deleteMessage(messageId: MessageId): Promise<void> {
    this.store.clearDeleteError();
    await this.store.delete(messageId);
  }

  protected beginDelete(messageId: MessageId): void {
    this.store.clearDeleteError();
    this.deletingMessageId.set(messageId);
  }

  protected cancelDelete(): void {
    this.store.clearDeleteError();
    this.deletingMessageId.set(null);
  }

  protected async confirmDelete(messageId: MessageId): Promise<void> {
    const deleted = await this.store.delete(messageId);

    if (deleted) {
      this.deletingMessageId.set(null);

      if (this.editingMessageId() === messageId) {
        this.editingMessageId.set(null);
      }
    }
  }
}
