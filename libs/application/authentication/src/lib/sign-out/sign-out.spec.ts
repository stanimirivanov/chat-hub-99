import { Effect, Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticationUnavailableError } from '../authentication-error';
import type { AuthenticationService } from '../authentication-service';
import { makeAuthenticationServiceTestLayer } from '../testing/make-authentication-service-test-layer';
import { signOut } from './sign-out';

describe('signOut', () => {
  it('delegates to the authentication service', async () => {
    const signOutService: AuthenticationService['signOut'] = vi.fn(() =>
      Effect.succeed(undefined)
    );

    const { layer } = makeAuthenticationServiceTestLayer({
      signOut: signOutService,
    });

    await Effect.runPromise(signOut.pipe(Effect.provide(layer)));

    expect(signOutService).toHaveBeenCalledOnce();
  });

  it('propagates the service failure unchanged', async () => {
    const failure = new AuthenticationUnavailableError({
      operation: 'sign-out',
      cause: new Error('Provider unavailable'),
    });

    const signOutService: AuthenticationService['signOut'] = vi.fn(() =>
      Effect.fail(failure)
    );

    const { layer } = makeAuthenticationServiceTestLayer({
      signOut: signOutService,
    });

    const result = await Effect.runPromise(
      signOut.pipe(Effect.provide(layer), Effect.either)
    );

    Either.match(result, {
      onLeft: (error) => {
        expect(error).toBe(failure);
      },
      onRight: () => {
        throw new Error('Expected sign-out to fail.');
      },
    });
  });
});
