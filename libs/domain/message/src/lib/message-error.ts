export class MessageNotFoundError {
  readonly _tag = 'MessageNotFoundError';

  constructor(readonly messageId: string) {}
}

export class MessageAccessDeniedError {
  readonly _tag = 'MessageAccessDeniedError';

  constructor(readonly operation: 'create' | 'edit' | 'delete' | 'read') {}
}

export class MessageValidationError {
  readonly _tag = 'MessageValidationError';

  constructor(readonly message: string) {}
}

export class MessagePersistenceError {
  readonly _tag = 'MessagePersistenceError';

  constructor(
    readonly operation: 'create' | 'edit' | 'delete' | 'read',
    readonly cause: unknown
  ) {}
}

export type MessageError =
  | MessageNotFoundError
  | MessageAccessDeniedError
  | MessageValidationError
  | MessagePersistenceError;
