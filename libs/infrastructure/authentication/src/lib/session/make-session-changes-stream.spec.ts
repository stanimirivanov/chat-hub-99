import type {
  AuthChangeEvent,
  Session,
  Subscription,
} from '@supabase/supabase-js';
import { Effect, Fiber, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseAuthenticationClient } from '../supabase-authentication-client';
import { makeSessionChangesStream } from './make-session-changes-stream';

describe('makeSessionChangesStream', () => {
  it('emits session changes and unsubscribes when interrupted', async () => {
    const unsubscribe = vi.fn();

    let authCallback:
      | ((event: AuthChangeEvent, session: Session | null) => void)
      | undefined;

    const client: SupabaseAuthenticationClient = {
      auth: {
        getSession: vi.fn(),

        signInWithPassword: vi.fn(),

        signOut: vi.fn(),

        onAuthStateChange: (callback) => {
          authCallback = callback;

          return {
            data: {
              subscription: {
                unsubscribe,
              } as Subscription,
            },
          };
        },
      },
    };

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

    authCallback?.('SIGNED_IN', {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'owner@chat-hub.local',
      },
    } as Session);

    authCallback?.('SIGNED_OUT', null);

    await Effect.runPromise(Effect.yieldNow());

    expect(observed).toEqual(['owner@chat-hub.local', null]);

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
