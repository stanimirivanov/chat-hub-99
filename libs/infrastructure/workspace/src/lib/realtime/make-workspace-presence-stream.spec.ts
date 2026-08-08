import { Chunk, Effect, Schema, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';
import { makeWorkspacePresenceStream } from './make-workspace-presence-stream';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const profileId = '10000000-0000-4000-8000-000000000001';

const makePresenceClientStub = (trackResult = 'ok') => {
  let sync: (() => void) | undefined;
  let subscriptionStatus: ((status: string, error?: Error) => void) | undefined;
  let state: unknown = {};
  const realtimeChannel = {
    on: vi.fn((_type: string, _filter: unknown, callback: () => void) => {
      sync = callback;
      return realtimeChannel;
    }),
    subscribe: vi.fn((callback: (status: string, error?: Error) => void) => {
      subscriptionStatus = callback;
      return realtimeChannel;
    }),
    presenceState: vi.fn(() => state),
    track: vi.fn().mockResolvedValue(trackResult),
  };
  const channel = vi.fn(() => realtimeChannel);
  const removeChannel = vi.fn().mockResolvedValue('ok');
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: profileId } },
    error: null,
  });

  const client = {
    auth: { getUser },
    channel,
    removeChannel,
  } as unknown as SupabaseWorkspaceClient;

  return {
    client,
    channel,
    realtimeChannel,
    removeChannel,
    emitSync: (nextState: unknown) => {
      state = nextState;
      sync?.();
    },
    emitStatus: (status: string, error?: Error) => {
      subscriptionStatus?.(status, error);
    },
  };
};

describe('makeWorkspacePresenceStream', () => {
  it('tracks the authenticated profile and emits validated synced identities', async () => {
    const stub = makePresenceClientStub();
    const collected = Effect.runPromise(
      makeWorkspacePresenceStream(stub.client, workspaceId).pipe(
        Stream.take(1),
        Stream.runCollect
      )
    );

    await vi.waitFor(() => expect(stub.channel).toHaveBeenCalledOnce());
    stub.emitStatus('SUBSCRIBED');
    await vi.waitFor(() =>
      expect(stub.realtimeChannel.track).toHaveBeenCalledOnce()
    );
    stub.emitSync({ [profileId]: [{ onlineAt: 'now' }] });

    expect(Chunk.toReadonlyArray(await collected)).toEqual([[profileId]]);
    expect(stub.channel).toHaveBeenCalledExactlyOnceWith(
      `workspace-presence:${workspaceId}`,
      {
        config: {
          private: true,
          presence: { enabled: true, key: profileId },
        },
      }
    );
    expect(stub.removeChannel).toHaveBeenCalledExactlyOnceWith(
      stub.realtimeChannel
    );
  });

  it('fails when the private channel cannot be joined', async () => {
    const stub = makePresenceClientStub();
    const result = Effect.runPromise(
      makeWorkspacePresenceStream(stub.client, workspaceId).pipe(
        Stream.runCollect,
        Effect.either
      )
    );

    await vi.waitFor(() => expect(stub.channel).toHaveBeenCalledOnce());
    stub.emitStatus('CHANNEL_ERROR', new Error('denied'));

    await expect(result).resolves.toMatchObject({
      _tag: 'Left',
      left: { _tag: 'WorkspacePresenceUnavailableError' },
    });
    expect(stub.removeChannel).toHaveBeenCalledExactlyOnceWith(
      stub.realtimeChannel
    );
  });

  it('fails when the authenticated profile cannot be tracked', async () => {
    const stub = makePresenceClientStub('error');
    const result = Effect.runPromise(
      makeWorkspacePresenceStream(stub.client, workspaceId).pipe(
        Stream.runCollect,
        Effect.either
      )
    );

    await vi.waitFor(() => expect(stub.channel).toHaveBeenCalledOnce());
    stub.emitStatus('SUBSCRIBED');

    await expect(result).resolves.toMatchObject({
      _tag: 'Left',
      left: { _tag: 'WorkspacePresenceUnavailableError' },
    });
    expect(stub.removeChannel).toHaveBeenCalledExactlyOnceWith(
      stub.realtimeChannel
    );
  });
});
