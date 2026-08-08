import { Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { mapAuthenticationSession } from './map-authentication-session';

const makeSession = (
  email: unknown,
  userId: unknown = '00000000-0000-4000-8000-000000000001'
): unknown => ({
  user: {
    id: userId,
    email,
  },
});

describe('mapAuthenticationSession', () => {
  it('maps the application session projection', () => {
    const result = mapAuthenticationSession(
      makeSession('owner@omoikane.local'),
      'restore-session'
    );

    Either.match(result, {
      onLeft: () => {
        throw new Error('Expected session mapping to succeed.');
      },
      onRight: (session) => {
        expect(session).toEqual({
          userId: '00000000-0000-4000-8000-000000000001',
          email: 'owner@omoikane.local',
        });
      },
    });
  });

  it.each([undefined, null, '', '   '])(
    'rejects a session with unusable email %s',
    (email) => {
      const result = mapAuthenticationSession(
        makeSession(email),
        'restore-session'
      );

      Either.match(result, {
        onLeft: (error) => {
          expect(error).toMatchObject({
            _tag: 'AuthenticationUnavailableError',
            operation: 'restore-session',
          });
        },
        onRight: () => {
          throw new Error('Expected session mapping to fail.');
        },
      });
    }
  );

  it('rejects a malformed user identifier', () => {
    const result = mapAuthenticationSession(
      makeSession('owner@omoikane.local', 'not-a-uuid'),
      'restore-session'
    );

    expect(Either.isLeft(result)).toBe(true);

    if (Either.isLeft(result)) {
      expect(result.left).toMatchObject({
        _tag: 'AuthenticationUnavailableError',
        operation: 'restore-session',
      });
    }
  });

  it.each([undefined, null, {}, { user: null }])(
    'rejects malformed provider session %j',
    (session) => {
      const result = mapAuthenticationSession(session, 'restore-session');

      expect(Either.isLeft(result)).toBe(true);

      if (Either.isLeft(result)) {
        expect(result.left).toMatchObject({
          _tag: 'AuthenticationUnavailableError',
          operation: 'restore-session',
        });
      }
    }
  );
});
