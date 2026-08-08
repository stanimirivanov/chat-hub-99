import type { ChannelId } from '@omoikane/domain/channel';
import type { MessageId } from '@omoikane/domain/message';
import {
  MessageAccessDeniedError,
  MessageContentUnchangedError,
  MessageCreationNotAllowedError,
  MessageMutationNotAllowedError,
  MessageNotFoundError,
  MessageRepositoryUnavailableError,
  type MessageRepositoryCreateError,
  type MessageRepositoryEditError,
  type MessageRepositoryError,
} from '@omoikane/application/message';

type MessageCommandRepositoryError =
  | MessageRepositoryError
  | MessageMutationNotAllowedError;

export type MessageRepositoryOperation = 'create' | 'edit' | 'delete' | 'read';

export interface PostgrestErrorLike {
  readonly code: string;
  readonly message: string;
  readonly details?: string;
  readonly hint?: string;
}

const unchangedMessageContentErrorMessage =
  'Edited message content must differ from the current content';

/**
 * Maps failures from the create-message RPC into its precise vocabulary.
 *
 * Within this command, PostgreSQL `55000` is the stable contract for an
 * archived channel or workspace. Other failures retain the common repository
 * translation used by create operations.
 */
export const mapCreateMessagePostgrestError = (
  channelId: ChannelId,
  error: PostgrestErrorLike
): MessageRepositoryCreateError => {
  if (error.code === '55000') {
    return new MessageCreationNotAllowedError({ channelId });
  }

  return mapPostgrestError('create', error);
};

/**
 * Maps failures from the edit-message RPC into its precise application
 * vocabulary.
 *
 * PostgreSQL code `22023` is shared by unrelated invalid-parameter failures,
 * so both the stable code and the database command's exact message are needed
 * before classifying the failure as unchanged content.
 */
export const mapEditMessagePostgrestError = (
  messageId: MessageId,
  error: PostgrestErrorLike
): MessageRepositoryEditError => {
  if (
    error.code === '22023' &&
    error.message === unchangedMessageContentErrorMessage
  ) {
    return new MessageContentUnchangedError({ messageId });
  }

  return mapMessageCommandPostgrestError('edit', messageId, error);
};

/**
 * Maps errors for operations that target a specific existing message.
 */
export const mapMessageCommandPostgrestError = (
  operation: 'edit' | 'delete',
  messageId: MessageId,
  error: PostgrestErrorLike
): MessageCommandRepositoryError => {
  switch (error.code) {
    case '42501':
      return new MessageAccessDeniedError({ operation });

    case 'P0002':
      return new MessageNotFoundError({ messageId });

    case '55000':
      return new MessageMutationNotAllowedError({ messageId, operation });

    default:
      return mapThrownRepositoryError(operation, error);
  }
};

export const mapPostgrestError = (
  operation: MessageRepositoryOperation,
  error: PostgrestErrorLike
): MessageRepositoryError => {
  switch (error.code) {
    case '42501':
      return new MessageAccessDeniedError({ operation });

    default:
      return mapThrownRepositoryError(operation, error);
  }
};

export const mapThrownRepositoryError = (
  operation: MessageRepositoryOperation,
  cause: unknown
): MessageRepositoryError =>
  new MessageRepositoryUnavailableError({
    operation,
    cause,
  });
