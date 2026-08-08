import { Chunk, Effect, Schema, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ChannelIdSchema } from '@omoikane/domain/channel';
import type { SupabaseChannelClient } from '../supabase-channel-client';
import { makeChannelTypingConnection } from './make-channel-typing-connection';

const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const profileId = '10000000-0000-4000-8000-000000000001';

const makeClientStub = () => {
  let broadcast: ((payload: unknown) => void) | undefined;
  let status: ((value: string, error?: Error) => void) | undefined;
  const realtimeChannel = {
    on: vi.fn((_type, _filter, callback) => {
      broadcast = callback;
      return realtimeChannel;
    }),
    subscribe: vi.fn((callback) => {
      status = callback;
      return realtimeChannel;
    }),
    send: vi.fn().mockResolvedValue('ok'),
  };
  const channel = vi.fn(() => realtimeChannel);
  const removeChannel = vi.fn().mockResolvedValue('ok');
  const client = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: profileId } }, error: null }),
    },
    channel,
    removeChannel,
  } as unknown as SupabaseChannelClient;
  return {
    client,
    channel,
    realtimeChannel,
    removeChannel,
    subscribed: () => status?.('SUBSCRIBED'),
    emit: (payload: unknown) => broadcast?.(payload),
  };
};

describe('makeChannelTypingConnection', () => {
  it('publishes and observes on one scoped private channel', async () => {
    const stub = makeClientStub();
    const result = Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const connection = yield* makeChannelTypingConnection(
            stub.client,
            channelId
          );
          yield* connection.setTyping(true);
          return yield* connection.events.pipe(
            Stream.take(1),
            Stream.runCollect
          );
        })
      )
    );

    await vi.waitFor(() => expect(stub.channel).toHaveBeenCalledOnce());
    stub.subscribed();
    await vi.waitFor(() =>
      expect(stub.realtimeChannel.send).toHaveBeenCalledOnce()
    );
    stub.emit({ payload: { channelId, profileId, isTyping: true } });

    expect(Chunk.toReadonlyArray(await result)).toMatchObject([
      { isTyping: true },
    ]);
    expect(stub.realtimeChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'typing',
      payload: { channelId, profileId, isTyping: true },
    });
    expect(stub.removeChannel).toHaveBeenCalledExactlyOnceWith(
      stub.realtimeChannel
    );
  });
});
