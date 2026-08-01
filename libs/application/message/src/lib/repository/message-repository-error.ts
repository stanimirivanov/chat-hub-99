import { Data } from 'effect';
import type { MessageId } from '@chat-hub/domain/message';

export type MessageRepositoryOperation = 'create' | 'edit' | 'delete' | 'read';

export class MessageNotFoundError extends Data.TaggedError(
  'MessageNotFoundError'
)<{
  readonly messageId: MessageId;
}> {}

/**
 * Indicates that an edit normalizes to the message's current content.
 *
 * The repository owns this outcome because only the authoritative persisted
 * projection can make the comparison safely when concurrent edits are
 * possible.
 */
export class MessageContentUnchangedError extends Data.TaggedError(
  'MessageContentUnchangedError'
)<{
  readonly messageId: MessageId;
}> {}

/**
 * Indicates that current message or parent lifecycle state forbids a command.
 *
 * The operation identifies the attempted user action without exposing whether
 * an archived parent or an already-deleted message caused the rejection.
 */
export class MessageMutationNotAllowedError extends Data.TaggedError(
  'MessageMutationNotAllowedError'
)<{
  readonly messageId: MessageId;
  readonly operation: 'edit' | 'delete';
}> {}

export class MessageAccessDeniedError extends Data.TaggedError(
  'MessageAccessDeniedError'
)<{
  readonly operation: MessageRepositoryOperation;
}> {}

export class MessageRepositoryUnavailableError extends Data.TaggedError(
  'MessageRepositoryUnavailableError'
)<{
  readonly operation: MessageRepositoryOperation;
  readonly cause: unknown;
}> {}

export class InvalidMessageDataError extends Data.TaggedError(
  'InvalidMessageDataError'
)<{
  readonly cause: unknown;
}> {}

export type MessageRepositoryError =
  | MessageNotFoundError
  | MessageAccessDeniedError
  | MessageRepositoryUnavailableError
  | InvalidMessageDataError;

/** Failures specific to appending a new version of an existing message. */
export type MessageRepositoryEditError =
  | MessageRepositoryError
  | MessageContentUnchangedError
  | MessageMutationNotAllowedError;

/** Failures specific to soft-deleting an existing message. */
export type MessageRepositoryDeleteError =
  | MessageRepositoryError
  | MessageMutationNotAllowedError;
