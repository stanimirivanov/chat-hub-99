import {
  MessageAccessDeniedError,
  MessageNotFoundError,
  MessageRepositoryUnavailableError,
  type MessageRepositoryError,
} from '@chat-hub/application/message';
import type { MessageId } from '@chat-hub/domain/message';

export type MessageRepositoryOperation = 'create' | 'edit' | 'delete' | 'read';

export interface PostgrestErrorLike {
  readonly code: string;
  readonly message: string;
  readonly details?: string;
  readonly hint?: string;
}

/**
 * Maps errors for operations that target a specific existing message.
 */
export const mapMessageCommandPostgrestError = (
  operation: 'edit' | 'delete',
  messageId: MessageId,
  error: PostgrestErrorLike
): MessageRepositoryError => {
  switch (error.code) {
    case '42501':
      return new MessageAccessDeniedError(operation);

    case 'P0002':
      return new MessageNotFoundError(messageId);

    default:
      return new MessageRepositoryUnavailableError(operation, error);
  }
};

export const mapPostgrestError = (
  operation: MessageRepositoryOperation,
  error: PostgrestErrorLike
): MessageRepositoryError => {
  switch (error.code) {
    case '42501':
      return new MessageAccessDeniedError(operation);

    default:
      return new MessageRepositoryUnavailableError(operation, error);
  }
};

export const mapThrownRepositoryError = (
  operation: MessageRepositoryOperation,
  cause: unknown
): MessageRepositoryError =>
  new MessageRepositoryUnavailableError(operation, cause);
