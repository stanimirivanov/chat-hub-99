import type { Session } from '@supabase/supabase-js';
import { Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { mapAuthenticationSession } from './map-authentication-session';

const makeSession = (email: string | undefined): Session =>
  ({
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email,
    },
  }) as Session;

describe('mapAuthenticationSession', () => {
  it('maps the application session projection', () => {
    const result = mapAuthenticationSession(
      makeSession('owner@chat-hub.local'),
      'restore-session'
    );

    Either.match(result, {
      onLeft: () => {
        throw new Error('Expected session mapping to succeed.');
      },
      onRight: (session) => {
        expect(session).toEqual({
          userId: '00000000-0000-4000-8000-000000000001',
          email: 'owner@chat-hub.local',
        });
      },
    });
  });

  it('rejects a session without email', () => {
    const result = mapAuthenticationSession(
      makeSession(undefined),
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
  });
});
