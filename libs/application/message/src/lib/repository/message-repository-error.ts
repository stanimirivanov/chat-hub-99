import { Data } from 'effect';
import type { MessageId } from '@chat-hub/domain/message';

export type MessageRepositoryOperation = 'create' | 'edit' | 'delete' | 'read';

export class MessageNotFoundError extends Data.TaggedError(
  'MessageNotFoundError'
)<{
  readonly messageId: MessageId;
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
