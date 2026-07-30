import { Effect, Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticationUnavailableError } from '../authentication-error';
import type { AuthenticationService } from '../authentication-service';
import {
  authenticationSession,
  makeAuthenticationServiceLayer,
} from '../testing';
import { restoreSession } from './restore-session';

describe('restoreSession', () => {
  it('returns the current session', async () => {
    const getCurrentSession: AuthenticationService['getCurrentSession'] = vi.fn(
      () => Effect.succeed(authenticationSession)
    );

    const layer = makeAuthenticationServiceLayer({
      getCurrentSession,
    });

    const result = await Effect.runPromise(
      restoreSession.pipe(Effect.provide(layer))
    );

    expect(result).toEqual(authenticationSession);
    expect(getCurrentSession).toHaveBeenCalledOnce();
  });

  it('returns null when no session exists', async () => {
    const getCurrentSession: AuthenticationService['getCurrentSession'] = vi.fn(
      () => Effect.succeed(null)
    );

    const layer = makeAuthenticationServiceLayer({
      getCurrentSession,
    });

    const result = await Effect.runPromise(
      restoreSession.pipe(Effect.provide(layer))
    );

    expect(result).toBeNull();
    expect(getCurrentSession).toHaveBeenCalledOnce();
  });

  it('propagates the service failure unchanged', async () => {
    const failure = new AuthenticationUnavailableError({
      operation: 'restore-session',
      cause: new Error('Provider unavailable'),
    });

    const getCurrentSession: AuthenticationService['getCurrentSession'] = vi.fn(
      () => Effect.fail(failure)
    );

    const layer = makeAuthenticationServiceLayer({
      getCurrentSession,
    });

    const result = await Effect.runPromise(
      restoreSession.pipe(Effect.provide(layer), Effect.either)
    );

    Either.match(result, {
      onLeft: (error) => {
        expect(error).toBe(failure);
      },
      onRight: () => {
        throw new Error('Expected session restoration to fail.');
      },
    });
  });
});
