import { Effect, Either, Fiber, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseMessageClient } from '../supabase-message-client';
import { Schema } from 'effect';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { makeWorkspaceUnreadChangesStream } from './make-workspace-unread-changes-stream';

type BroadcastCallback = () => void;
type StatusCallback = (
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
) => void;

const profileId = '00000000-0000-4000-8000-000000000001';
const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000050'
);

const makeRealtimeClientStub = ({ authenticated = true } = {}) => {
  const subscriptions = new Map<
    string,
    { broadcast?: BroadcastCallback; status?: StatusCallback }
  >();
  const channels = new Map<string, object>();
  const channel = vi.fn((topic: string) => {
    const callbacks: {
      broadcast?: BroadcastCallback;
      status?: StatusCallback;
    } = {};
    const realtimeChannel = {
      on: vi.fn(
        (_type: string, _filter: unknown, callback: BroadcastCallback) => {
          callbacks.broadcast = callback;
          return realtimeChannel;
        }
      ),
      subscribe: vi.fn((callback: StatusCallback) => {
        callbacks.status = callback;
        subscriptions.set(topic, callbacks);
        return realtimeChannel;
      }),
    };
    channels.set(topic, realtimeChannel);
    return realtimeChannel;
  });
  const removeChannel = vi.fn().mockResolvedValue('ok');
  const getUser = vi.fn().mockResolvedValue({
    data: { user: authenticated ? { id: profileId } : null },
    error: null,
  });
  const client = {
    auth: { getUser },
    channel,
    removeChannel,
  } as unknown as SupabaseMessageClient;

  return {
    client,
    channel,
    channels,
    removeChannel,
    emitBroadcast: (topic: string) => subscriptions.get(topic)?.broadcast?.(),
    emitStatus: (
      topic: string,
      status: Parameters<StatusCallback>[0],
      error?: Error
    ) => subscriptions.get(topic)?.status?.(status, error),
  };
};

describe('makeWorkspaceUnreadChangesStream', () => {
  it('emits after both private topics are ready and for either invalidation', async () => {
    const stub = makeRealtimeClientStub();
    const observed: void[] = [];
    const workspace = `workspace-unread:${workspaceId}`;
    const profile = `profile-unread:${profileId}`;
    const fiber = Effect.runFork(
      makeWorkspaceUnreadChangesStream(stub.client, workspaceId).pipe(
        Stream.runForEach((signal) =>
          Effect.sync(() => {
            observed.push(signal);
          })
        )
      )
    );

    await Effect.runPromise(Effect.yieldNow());
    stub.emitStatus(workspace, 'SUBSCRIBED');
    expect(observed).toHaveLength(0);
    stub.emitStatus(profile, 'SUBSCRIBED');
    stub.emitBroadcast(workspace);
    stub.emitBroadcast(profile);
    await Effect.runPromise(Effect.yieldNow());

    expect(observed).toHaveLength(3);
    expect(stub.channel).toHaveBeenCalledWith(workspace, {
      config: { private: true },
    });
    expect(stub.channel).toHaveBeenCalledWith(profile, {
      config: { private: true },
    });

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(stub.removeChannel).toHaveBeenCalledTimes(2);
    expect(stub.removeChannel).toHaveBeenCalledWith(
      stub.channels.get(workspace)
    );
    expect(stub.removeChannel).toHaveBeenCalledWith(stub.channels.get(profile));
  });

  it('fails before subscribing without an authenticated identity', async () => {
    const stub = makeRealtimeClientStub({ authenticated: false });
    const result = await Effect.runPromise(
      makeWorkspaceUnreadChangesStream(stub.client, workspaceId).pipe(
        Stream.runCollect,
        Effect.either
      )
    );

    expect(Either.isLeft(result)).toBe(true);
    expect(stub.channel).not.toHaveBeenCalled();
  });

  it.each(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'] as const)(
    'fails and releases both topics when one reports %s',
    async (status) => {
      const stub = makeRealtimeClientStub();
      const topic = `workspace-unread:${workspaceId}`;
      const fiber = Effect.runFork(
        makeWorkspaceUnreadChangesStream(stub.client, workspaceId).pipe(
          Stream.runDrain
        )
      );

      await Effect.runPromise(Effect.yieldNow());
      stub.emitStatus(topic, status, new Error('Realtime failed'));
      const result = await Effect.runPromise(
        Fiber.join(fiber).pipe(Effect.either)
      );

      expect(Either.isLeft(result)).toBe(true);
      expect(stub.removeChannel).toHaveBeenCalledTimes(2);
    }
  );
});
