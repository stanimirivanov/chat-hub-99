import { describe, expect, it } from 'vitest';
import { Schema } from 'effect';

import { MessageIdSchema } from '@chat-hub/domain/message';
import {
  mapEditMessagePostgrestError,
  mapMessageCommandPostgrestError,
  mapPostgrestError,
  mapThrownRepositoryError,
} from './message-repository-error-mapper';

describe('message repository error mapper', () => {
  it('maps permission errors to MessageAccessDeniedError', () => {
    const result = mapPostgrestError('read', {
      code: '42501',
      message: 'permission denied',
      details: '',
      hint: '',
    });

    expect(result._tag).toBe('MessageAccessDeniedError');

    if (result._tag === 'MessageAccessDeniedError') {
      expect(result.operation).toBe('read');
    }
  });

  it('maps unknown PostgREST errors to repository unavailable', () => {
    const error = {
      code: 'XX000',
      message: 'unexpected database failure',
      details: '',
      hint: '',
    };

    const result = mapPostgrestError('read', error);

    expect(result._tag).toBe('MessageRepositoryUnavailableError');

    if (result._tag === 'MessageRepositoryUnavailableError') {
      expect(result.operation).toBe('read');
      expect(result.cause).toBe(error);
    }
  });

  it('maps thrown request failures to repository unavailable', () => {
    const cause = new TypeError('Failed to fetch');

    const result = mapThrownRepositoryError('read', cause);

    expect(result._tag).toBe('MessageRepositoryUnavailableError');

    if (result._tag === 'MessageRepositoryUnavailableError') {
      expect(result.operation).toBe('read');
      expect(result.cause).toBe(cause);
    }
  });
});

const messageId = Schema.decodeUnknownSync(MessageIdSchema)(
  '00000000-0000-4000-8000-000000000030'
);

describe('message command error mapping', () => {
  it.each(['edit', 'delete'] as const)(
    'maps a %s lifecycle rejection to MessageMutationNotAllowedError',
    (operation) => {
      const result = mapMessageCommandPostgrestError(operation, messageId, {
        code: '55000',
        message: `Message ${messageId} is deleted`,
        details: '',
        hint: '',
      });

      expect(result).toMatchObject({
        _tag: 'MessageMutationNotAllowedError',
        messageId,
        operation,
      });
    }
  );

  it('maps only the stable edit no-op rejection to unchanged content', () => {
    const result = mapEditMessagePostgrestError(messageId, {
      code: '22023',
      message: 'Edited message content must differ from the current content',
      details: '',
      hint: '',
    });

    expect(result).toMatchObject({
      _tag: 'MessageContentUnchangedError',
      messageId,
    });
  });

  it('keeps unrelated invalid edit parameters as provider failures', () => {
    const error = {
      code: '22023',
      message: 'Another edit parameter is invalid',
      details: '',
      hint: '',
    };

    const result = mapEditMessagePostgrestError(messageId, error);

    expect(result).toMatchObject({
      _tag: 'MessageRepositoryUnavailableError',
      operation: 'edit',
      cause: error,
    });
  });

  it('maps a missing message to MessageNotFoundError', () => {
    const result = mapMessageCommandPostgrestError('edit', messageId, {
      code: 'P0002',
      message: `Message ${messageId} does not exist`,
      details: '',
      hint: '',
    });

    expect(result._tag).toBe('MessageNotFoundError');

    if (result._tag === 'MessageNotFoundError') {
      expect(result.messageId).toBe(messageId);
    }
  });

  it('maps edit permission errors to MessageAccessDeniedError', () => {
    const result = mapMessageCommandPostgrestError('edit', messageId, {
      code: '42501',
      message: 'Only the original message author may edit this message',
      details: '',
      hint: '',
    });

    expect(result._tag).toBe('MessageAccessDeniedError');

    if (result._tag === 'MessageAccessDeniedError') {
      expect(result.operation).toBe('edit');
    }
  });
});
