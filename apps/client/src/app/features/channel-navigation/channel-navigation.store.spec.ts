import { Either, Schema } from 'effect';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ChannelRepositoryUnavailableError } from '@chat-hub/application/channel';
import { ChannelIdSchema, type Channel } from '@chat-hub/domain/channel';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import { ChannelApplicationService } from '@client/core/channel/channel-application.service';
import { ChannelNavigationStore } from './channel-navigation.store';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const nextWorkspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);
const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000003'
);

const channel: Channel = {
  id: channelId,
  workspaceId,
  name: 'General',
  slug: 'general',
  description: null,
};

const configureStore = (
  listWorkspaceChannels = vi.fn().mockResolvedValue(Either.right([channel]))
) => {
  TestBed.configureTestingModule({
    providers: [
      ChannelNavigationStore,
      {
        provide: ChannelApplicationService,
        useValue: { listWorkspaceChannels },
      },
    ],
  });

  return {
    store: TestBed.inject(ChannelNavigationStore),
    listWorkspaceChannels,
  };
};

describe('ChannelNavigationStore', () => {
  it('loads each workspace once and selects only a loaded channel', async () => {
    const { store, listWorkspaceChannels } = configureStore();

    const firstLoad = store.load(workspaceId);
    expect(store.load(workspaceId)).toBe(firstLoad);
    await firstLoad;

    expect(store.channels()).toEqual([channel]);
    expect(store.select(channelId)).toBe(true);
    expect(store.selectedChannel()).toEqual(channel);

    await store.load(workspaceId);
    expect(listWorkspaceChannels).toHaveBeenCalledOnce();

    const unknownChannelId = Schema.decodeUnknownSync(ChannelIdSchema)(
      '00000000-0000-4000-8000-000000000004'
    );
    expect(store.select(unknownChannelId)).toBe(false);
  });

  it('exposes a safe error and permits retry', async () => {
    const failure = new ChannelRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    });
    const listWorkspaceChannels = vi
      .fn()
      .mockResolvedValueOnce(Either.left(failure))
      .mockResolvedValueOnce(Either.right([channel]));
    const { store } = configureStore(listWorkspaceChannels);

    await store.load(workspaceId);

    expect(store.loadStatus()).toBe('failed');
    expect(store.error()).toEqual({
      message: 'Channels are currently unavailable. Please try again.',
    });

    await store.load(workspaceId);

    expect(store.loadStatus()).toBe('loaded');
    expect(store.channels()).toEqual([channel]);
  });

  it('ignores a stale result after the selected workspace changes', async () => {
    let resolveFirst:
      | ((result: Either.Either<readonly Channel[], never>) => void)
      | undefined;
    const firstResult = new Promise<Either.Either<readonly Channel[], never>>(
      (resolve) => {
        resolveFirst = resolve;
      }
    );
    const listWorkspaceChannels = vi
      .fn()
      .mockReturnValueOnce(firstResult)
      .mockResolvedValueOnce(Either.right([]));
    const { store } = configureStore(listWorkspaceChannels);

    const oldLoad = store.load(workspaceId);
    await store.load(nextWorkspaceId);
    resolveFirst?.(Either.right([channel]));
    await oldLoad;

    expect(store.workspaceId()).toBe(nextWorkspaceId);
    expect(store.channels()).toEqual([]);
    expect(store.loadStatus()).toBe('loaded');
  });
});
