import type {
  AuthChangeEvent,
  Session,
  Subscription,
} from '@supabase/supabase-js';
import { Effect, Fiber, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticationSessionChange } from '@omoikane/application/authentication';
import {
  authenticationSession,
  makeSupabaseAuthenticationClientStub,
} from '../testing';
import { makeSessionChangesStream } from './make-session-changes-stream';

describe('makeSessionChangesStream', () => {
  it('emits session changes and unsubscribes when interrupted', async () => {
    const unsubscribe = vi.fn();

    let authCallback:
      | ((event: AuthChangeEvent, session: Session | null) => void)
      | undefined;

    const client = makeSupabaseAuthenticationClientStub({
      onAuthStateChange: (callback) => {
        authCallback = callback;

        return {
          data: {
            subscription: {
              id: 'auth-subscription',
              callback,
              unsubscribe,
            } satisfies Subscription,
          },
        };
      },
    });

    const observed: AuthenticationSessionChange[] = [];

    const program = makeSessionChangesStream(client).pipe(
      Stream.runForEach((change) =>
        Effect.sync(() => {
          observed.push(change);
        })
      )
    );

    const fiber = Effect.runFork(program);

    await Effect.runPromise(Effect.yieldNow());

    authCallback?.('SIGNED_IN', authenticationSession);

    authCallback?.('PASSWORD_RECOVERY', authenticationSession);

    authCallback?.('SIGNED_OUT', null);

    await Effect.runPromise(Effect.yieldNow());

    expect(observed).toEqual([
      {
        type: 'session',
        session: {
          userId: '00000000-0000-4000-8000-000000000001',
          email: 'owner@omoikane.local',
        },
      },
      {
        type: 'password-recovery',
        session: {
          userId: '00000000-0000-4000-8000-000000000001',
          email: 'owner@omoikane.local',
        },
      },
      { type: 'session', session: null },
    ]);

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('fails when a recovery event does not carry a session', async () => {
    const unsubscribe = vi.fn();
    let authCallback:
      | ((event: AuthChangeEvent, session: Session | null) => void)
      | undefined;
    const client = makeSupabaseAuthenticationClientStub({
      onAuthStateChange: (callback) => {
        authCallback = callback;

        return {
          data: {
            subscription: {
              id: 'auth-subscription',
              callback,
              unsubscribe,
            } satisfies Subscription,
          },
        };
      },
    });
    const resultPromise = Effect.runPromise(
      makeSessionChangesStream(client).pipe(Stream.runDrain, Effect.either)
    );

    await Effect.runPromise(Effect.yieldNow());
    authCallback?.('PASSWORD_RECOVERY', null);

    const result = await resultPromise;

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'AuthenticationUnavailableError',
        operation: 'observe-session',
      },
    });
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
