import {
  MessageAccessDeniedError,
  MessageRepositoryUnavailableError,
  type MessageRepositoryError,
} from '@chat-hub/application/message';

export type MessageRepositoryOperation = 'create' | 'edit' | 'delete' | 'read';

interface PostgrestErrorLike {
  readonly code: string;
  readonly message: string;
  readonly details?: string;
  readonly hint?: string;
}

/**
 * Maps a structured error returned by PostgREST or PostgreSQL into the
 * infrastructure-neutral error model exposed by MessageRepository.
 */
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

/**
 * Maps a value thrown while attempting to execute a Supabase request.
 *
 * Supabase normally returns PostgREST failures in the response's `error`
 * property. Thrown values usually indicate transport, abort, or client-level
 * failures.
 */
export const mapThrownRepositoryError = (
  operation: MessageRepositoryOperation,
  cause: unknown
): MessageRepositoryError =>
  new MessageRepositoryUnavailableError(operation, cause);
