import { describe, expect, it } from 'vitest';
import { Schema } from 'effect';
import { MessageIdSchema } from '@chat-hub/domain/message';
import { mapMessageCommandPostgrestError } from './message-repository-error-mapper';
import {
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
