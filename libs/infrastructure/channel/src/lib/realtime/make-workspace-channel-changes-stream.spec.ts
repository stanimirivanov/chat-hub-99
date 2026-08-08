import { Effect, Either, Fiber, Schema, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import type { SupabaseChannelClient } from '../supabase-channel-client';
import { makeWorkspaceChannelChangesStream } from './make-workspace-channel-changes-stream';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);

type BroadcastCallback = () => void;
type StatusCallback = (
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
) => void;

const makeRealtimeClientStub = () => {
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
  const client = { channel, removeChannel } as unknown as SupabaseChannelClient;

  return {
    client,
    channel,
    realtimeChannel,
    removeChannel,
    emitBroadcast: () => broadcastCallback?.(),
    emitStatus: (status: Parameters<StatusCallback>[0], error?: Error) =>
      statusCallback?.(status, error),
  };
};

describe('makeWorkspaceChannelChangesStream', () => {
  it('emits after readiness and on changes, then releases its private channel', async () => {
    const stub = makeRealtimeClientStub();
    const observed: void[] = [];
    const fiber = Effect.runFork(
      makeWorkspaceChannelChangesStream(stub.client, workspaceId).pipe(
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
    expect(stub.channel).toHaveBeenCalledExactlyOnceWith(
      `workspace-channels:${workspaceId}`,
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

  it.each(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'] as const)(
    'fails and releases the channel when the provider reports %s',
    async (status) => {
      const stub = makeRealtimeClientStub();
      const fiber = Effect.runFork(
        makeWorkspaceChannelChangesStream(stub.client, workspaceId).pipe(
          Stream.runDrain
        )
      );

      await Effect.runPromise(Effect.yieldNow());
      stub.emitStatus(status, new Error('Realtime failed'));
      const result = await Effect.runPromise(
        Fiber.join(fiber).pipe(Effect.either)
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe('ChannelRepositoryUnavailableError');
      }
      expect(stub.removeChannel).toHaveBeenCalledOnce();
    }
  );
});
