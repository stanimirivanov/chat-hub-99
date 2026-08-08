import { Effect, Either, Fiber, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseMessageClient } from '../supabase-message-client';
import { channelId, messageId } from '../testing';
import { makeMessageChangesStream } from './make-message-changes-stream';

type ChangeCallback = (payload: unknown) => void;
type StatusCallback = (
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR',
  error?: Error
) => void;

const makeRealtimeClientStub = () => {
  let changeCallback: ChangeCallback | undefined;
  let statusCallback: StatusCallback | undefined;

  const realtimeChannel = {
    on: vi.fn((_type: string, _filter: unknown, callback: ChangeCallback) => {
      changeCallback = callback;
      return realtimeChannel;
    }),
    subscribe: vi.fn((callback: StatusCallback) => {
      statusCallback = callback;
      return realtimeChannel;
    }),
  };
  const channel = vi.fn(() => realtimeChannel);
  const removeChannel = vi.fn().mockResolvedValue('ok');
  const client = {
    channel,
    removeChannel,
  } as unknown as SupabaseMessageClient;

  return {
    client,
    channel,
    realtimeChannel,
    removeChannel,
    emitChange: (payload: unknown) => changeCallback?.(payload),
    emitStatus: (status: Parameters<StatusCallback>[0], error?: Error) =>
      statusCallback?.(status, error),
  };
};

describe('makeMessageChangesStream', () => {
  it('emits validated notifications and removes the channel on interruption', async () => {
    const stub = makeRealtimeClientStub();
    const observed: unknown[] = [];
    const program = makeMessageChangesStream(stub.client, channelId).pipe(
      Stream.runForEach((notification) =>
        Effect.sync(() => {
          observed.push(notification);
        })
      )
    );
    const fiber = Effect.runFork(program);

    await Effect.runPromise(Effect.yieldNow());

    stub.emitChange({
      eventType: 'INSERT',
      new: {
        message_id: messageId,
        channel_id: channelId,
      },
    });

    await Effect.runPromise(Effect.yieldNow());

    expect(observed).toEqual([
      {
        kind: 'created',
        messageId,
      },
    ]);
    expect(stub.channel).toHaveBeenCalledExactlyOnceWith(
      `message-heads:${channelId}`
    );
    expect(stub.realtimeChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'message_heads',
        filter: `channel_id=eq.${channelId}`,
      },
      expect.any(Function)
    );

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(stub.removeChannel).toHaveBeenCalledExactlyOnceWith(
      stub.realtimeChannel
    );
  });

  it.each(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'] as const)(
    'fails when the provider reports %s',
    async (status) => {
      const stub = makeRealtimeClientStub();
      const fiber = Effect.runFork(
        makeMessageChangesStream(stub.client, channelId).pipe(Stream.runDrain)
      );

      await Effect.runPromise(Effect.yieldNow());

      stub.emitStatus(status, new Error('Realtime failed'));

      const result = await Effect.runPromise(
        Fiber.join(fiber).pipe(Effect.either)
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe('MessageRepositoryUnavailableError');
      }
      expect(stub.removeChannel).toHaveBeenCalledOnce();
    }
  );

  it('fails malformed payloads and releases the provider channel', async () => {
    const stub = makeRealtimeClientStub();
    const fiber = Effect.runFork(
      makeMessageChangesStream(stub.client, channelId).pipe(Stream.runDrain)
    );

    await Effect.runPromise(Effect.yieldNow());
    stub.emitChange({ eventType: 'DELETE', new: {} });

    const result = await Effect.runPromise(
      Fiber.join(fiber).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidMessageDataError');
    }
    expect(stub.removeChannel).toHaveBeenCalledOnce();
  });
});
