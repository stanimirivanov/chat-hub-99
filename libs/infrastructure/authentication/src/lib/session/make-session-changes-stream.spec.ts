import type {
  AuthChangeEvent,
  Session,
  Subscription,
} from '@supabase/supabase-js';
import { Effect, Fiber, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
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

    const observed: Array<string | null> = [];

    const program = makeSessionChangesStream(client).pipe(
      Stream.runForEach((session) =>
        Effect.sync(() => {
          observed.push(session?.email ?? null);
        })
      )
    );

    const fiber = Effect.runFork(program);

    await Effect.runPromise(Effect.yieldNow());

    authCallback?.('SIGNED_IN', authenticationSession);

    authCallback?.('SIGNED_OUT', null);

    await Effect.runPromise(Effect.yieldNow());

    expect(observed).toEqual(['owner@chat-hub.local', null]);

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
