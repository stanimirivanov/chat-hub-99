import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import type { Message, MessageId } from '@chat-hub/domain/message';
import { AuthenticationStore } from '@client/features/authentication/store/authentication.store';
import { ChannelMessagesStore } from '../channel-messages.store';

/**
 * Renders channel history and exposes author-only mutation controls.
 *
 * The browser check improves presentation correctness; Supabase command
 * authorization remains the security boundary.
 */
@Component({
  selector: 'app-channel-message-history',
  standalone: true,
  templateUrl: './channel-message-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelMessageHistoryComponent {
  protected readonly store = inject(ChannelMessagesStore);

  private readonly authenticationStore = inject(AuthenticationStore);

  protected readonly editingMessageId = signal<MessageId | null>(null);

  protected readonly deletingMessageId = signal<MessageId | null>(null);

  protected isAuthoredByCurrentUser(message: Message): boolean {
    return message.authorId === this.authenticationStore.session()?.userId;
  }

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
