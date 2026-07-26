import { describe, expect, it } from 'vitest';

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
