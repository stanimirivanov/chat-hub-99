import type { MessageId } from '@chat-hub/domain/message';

export class MessageNotFoundError {
  readonly _tag = 'MessageNotFoundError';

  constructor(readonly messageId: MessageId) {}
}

export class MessageAccessDeniedError {
  readonly _tag = 'MessageAccessDeniedError';

  constructor(readonly operation: 'create' | 'edit' | 'delete' | 'read') {}
}

export class MessageRepositoryUnavailableError {
  readonly _tag = 'MessageRepositoryUnavailableError';

  constructor(
    readonly operation: 'create' | 'edit' | 'delete' | 'read',
    readonly cause: unknown
  ) {}
}

export class InvalidMessageDataError {
  readonly _tag = 'InvalidMessageDataError';

  constructor(readonly cause: unknown) {}
}

export type MessageRepositoryError =
  | MessageNotFoundError
  | MessageAccessDeniedError
  | MessageRepositoryUnavailableError
  | InvalidMessageDataError;
