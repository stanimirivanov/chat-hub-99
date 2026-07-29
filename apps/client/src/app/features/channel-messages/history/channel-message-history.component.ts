import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import type { MessageId } from '@chat-hub/domain/message';
import { ChannelMessagesStore } from '../channel-messages.store';

@Component({
  selector: 'app-channel-message-history',
  standalone: true,
  templateUrl: './channel-message-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelMessageHistoryComponent {
  protected readonly store = inject(ChannelMessagesStore);

  protected readonly editingMessageId = signal<MessageId | null>(null);

  protected readonly deletingMessageId = signal<MessageId | null>(null);

  protected beginEdit(messageId: MessageId): void {
    this.store.clearEditError();
    this.deletingMessageId.set(null);
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

  protected beginDelete(messageId: MessageId): void {
    this.store.clearDeleteError();
    this.editingMessageId.set(null);
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
    }
  }
}