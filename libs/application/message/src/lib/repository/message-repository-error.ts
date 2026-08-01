import { Data } from 'effect';
import type { ChannelId } from '@chat-hub/domain/channel';
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
 * Indicates that the target channel or its workspace no longer accepts
 * messages.
 *
 * The stable channel identity is sufficient for callers; infrastructure keeps
 * the specific archived-parent diagnostic behind the repository boundary.
 */
export class MessageCreationNotAllowedError extends Data.TaggedError(
  'MessageCreationNotAllowedError'
)<{
  readonly channelId: ChannelId;
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

/** Failures specific to creating a message in a channel. */
export type MessageRepositoryCreateError =
  | MessageRepositoryError
  | MessageCreationNotAllowedError;

/** Failures specific to appending a new version of an existing message. */
export type MessageRepositoryEditError =
  | MessageRepositoryError
  | MessageContentUnchangedError
  | MessageMutationNotAllowedError;

/** Failures specific to soft-deleting an existing message. */
export type MessageRepositoryDeleteError =
  | MessageRepositoryError
  | MessageMutationNotAllowedError;
