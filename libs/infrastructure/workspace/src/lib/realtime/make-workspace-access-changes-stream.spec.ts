import { Effect, Either, Fiber, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';
import { makeWorkspaceAccessChangesStream } from './make-workspace-access-changes-stream';

type BroadcastCallback = () => void;
type StatusCallback = (
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
) => void;

const userId = '00000000-0000-4000-8000-000000000001';

const makeRealtimeClientStub = ({
  authenticated = true,
}: { readonly authenticated?: boolean } = {}) => {
  let broadcastCallback: BroadcastCallback | undefined;
  let statusCallback: StatusCallback | undefined;

  const realtimeChannel = {
    on: vi.fn(
      (_type: string, _filter: unknown, callback: BroadcastCallback) => {
        broadcastCallback = callback;
        return realtimeChannel;
      }
    ),
    subscribe: vi.fn((callback: StatusCallback) => {
      statusCallback = callback;
      return realtimeChannel;
    }),
  };
  const channel = vi.fn(() => realtimeChannel);
  const removeChannel = vi.fn().mockResolvedValue('ok');
  const getUser = vi.fn().mockResolvedValue({
    data: { user: authenticated ? { id: userId } : null },
    error: null,
  });
  const client = {
    auth: { getUser },
    channel,
    removeChannel,
  } as unknown as SupabaseWorkspaceClient;

  return {
    client,
    getUser,
    channel,
    realtimeChannel,
    removeChannel,
    emitBroadcast: () => broadcastCallback?.(),
    emitStatus: (status: Parameters<StatusCallback>[0], error?: Error) =>
      statusCallback?.(status, error),
  };
};

describe('makeWorkspaceAccessChangesStream', () => {
  it('emits after readiness and on changes, then releases its private channel', async () => {
    const stub = makeRealtimeClientStub();
    const observed: void[] = [];
    const fiber = Effect.runFork(
      makeWorkspaceAccessChangesStream(stub.client).pipe(
        Stream.runForEach((signal) =>
          Effect.sync(() => {
            observed.push(signal);
          })
        )
      )
    );

    await Effect.runPromise(Effect.yieldNow());
    stub.emitStatus('SUBSCRIBED');
    stub.emitBroadcast();
    await Effect.runPromise(Effect.yieldNow());

    expect(observed).toHaveLength(2);
    expect(stub.getUser).toHaveBeenCalledOnce();
    expect(stub.channel).toHaveBeenCalledExactlyOnceWith(
      `workspace-access:${userId}`,
      { config: { private: true } }
    );
    expect(stub.realtimeChannel.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'changed' },
      expect.any(Function)
    );

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(stub.removeChannel).toHaveBeenCalledExactlyOnceWith(
      stub.realtimeChannel
    );
  });

  it('fails before subscribing when no authenticated identity is available', async () => {
    const stub = makeRealtimeClientStub({ authenticated: false });

    const result = await Effect.runPromise(
      makeWorkspaceAccessChangesStream(stub.client).pipe(
        Stream.runCollect,
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
    }
    expect(stub.channel).not.toHaveBeenCalled();
  });

  it.each(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'] as const)(
    'fails and releases the channel when the provider reports %s',
    async (status) => {
      const stub = makeRealtimeClientStub();
      const fiber = Effect.runFork(
        makeWorkspaceAccessChangesStream(stub.client).pipe(Stream.runDrain)
      );

      await Effect.runPromise(Effect.yieldNow());
      stub.emitStatus(status, new Error('Realtime failed'));

      const result = await Effect.runPromise(
        Fiber.join(fiber).pipe(Effect.either)
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe('WorkspaceRepositoryUnavailableError');
      }
      expect(stub.removeChannel).toHaveBeenCalledOnce();
    }
  );
});
