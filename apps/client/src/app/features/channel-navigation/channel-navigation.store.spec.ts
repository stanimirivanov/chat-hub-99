import { Either, Schema } from 'effect';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  ChannelUpdateNotAllowedError,
  ChannelRepositoryUnavailableError,
  ChannelSlugUnavailableError,
  type UpdatedChannelDetails,
  type UpdateChannelError,
} from '@chat-hub/application/channel';
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

const createdChannelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000005'
);
const createdChannel: Channel = {
  id: createdChannelId,
  workspaceId,
  name: 'Design',
  slug: 'design',
  description: 'Design collaboration',
};

const updatedChannel: Channel = {
  ...channel,
  name: 'Product Design',
  description: 'Design collaboration',
};

const updatedDetails: UpdatedChannelDetails = {
  channelId,
  name: updatedChannel.name,
  description: updatedChannel.description,
};

const configureStore = (
  listWorkspaceChannels = vi.fn().mockResolvedValue(Either.right([channel])),
  createChannel = vi.fn().mockResolvedValue(Either.right(createdChannel)),
  updateChannel = vi.fn().mockResolvedValue(Either.right(updatedDetails))
) => {
  TestBed.configureTestingModule({
    providers: [
      ChannelNavigationStore,
      {
        provide: ChannelApplicationService,
        useValue: { createChannel, listWorkspaceChannels, updateChannel },
      },
    ],
  });

  return {
    store: TestBed.inject(ChannelNavigationStore),
    createChannel,
    listWorkspaceChannels,
    updateChannel,
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

    store.clearSelection();
    expect(store.selectedChannel()).toBeNull();

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

  it('creates, inserts, and returns a channel without changing selection', async () => {
    const { store, createChannel } = configureStore();
    await store.load(workspaceId);
    store.select(channelId);

    const result = await store.createChannel({
      name: 'Design',
      slug: 'design',
      description: 'Design collaboration',
    });

    expect(createChannel).toHaveBeenCalledExactlyOnceWith({
      workspaceId,
      name: 'Design',
      slug: 'design',
      description: 'Design collaboration',
    });
    expect(result).toBe(createdChannel);
    expect(store.channels()).toEqual([createdChannel, channel]);
    expect(store.selectedChannelId()).toBe(channelId);
    expect(store.creationStatus()).toBe('idle');
    expect(store.creationError()).toBeNull();
  });

  it('keeps creation failure separate from the loaded collection', async () => {
    const failure = new ChannelSlugUnavailableError({
      workspaceId,
      slug: 'design',
    });
    const createChannel = vi.fn().mockResolvedValue(Either.left(failure));
    const { store } = configureStore(undefined, createChannel);
    await store.load(workspaceId);

    const result = await store.createChannel({
      name: 'Design',
      slug: 'design',
    });

    expect(result).toBeNull();
    expect(store.loadStatus()).toBe('loaded');
    expect(store.channels()).toEqual([channel]);
    expect(store.creationStatus()).toBe('failed');
    expect(store.creationError()).toEqual({
      message: 'That channel URL is already in use in this workspace.',
    });

    store.clearCreationError();
    expect(store.creationStatus()).toBe('idle');
    expect(store.creationError()).toBeNull();
  });

  it('ignores a channel created after the selected workspace changes', async () => {
    let resolveCreation:
      | ((result: Either.Either<Channel, never>) => void)
      | undefined;
    const creationResult = new Promise<Either.Either<Channel, never>>(
      (resolve) => {
        resolveCreation = resolve;
      }
    );
    const createChannel = vi.fn().mockReturnValue(creationResult);
    const listWorkspaceChannels = vi
      .fn()
      .mockResolvedValueOnce(Either.right([channel]))
      .mockResolvedValueOnce(Either.right([]));
    const { store } = configureStore(listWorkspaceChannels, createChannel);
    await store.load(workspaceId);

    const creation = store.createChannel({ name: 'Design', slug: 'design' });
    await store.load(nextWorkspaceId);
    resolveCreation?.(Either.right(createdChannel));

    expect(await creation).toBeNull();
    expect(store.workspaceId()).toBe(nextWorkspaceId);
    expect(store.channels()).toEqual([]);
    expect(store.creationStatus()).toBe('idle');
  });

  it('updates and reorders the selected channel from normalized details', async () => {
    const { store, updateChannel } = configureStore(
      vi.fn().mockResolvedValue(Either.right([channel, createdChannel]))
    );
    await store.load(workspaceId);
    store.select(channelId);

    const result = await store.updateSelectedChannel({
      name: '  Product Design  ',
      description: '  Design collaboration  ',
    });

    expect(updateChannel).toHaveBeenCalledExactlyOnceWith({
      channelId,
      name: '  Product Design  ',
      description: '  Design collaboration  ',
    });
    expect(result).toEqual(updatedChannel);
    expect(store.channels()).toEqual([createdChannel, updatedChannel]);
    expect(store.selectedChannel()).toEqual(updatedChannel);
    expect(store.updateStatus()).toBe('idle');
    expect(store.updateError()).toBeNull();
  });

  it('keeps update failure separate from the selected channel', async () => {
    const failure = new ChannelUpdateNotAllowedError({ channelId });
    const updateResult: Either.Either<
      UpdatedChannelDetails,
      UpdateChannelError
    > = Either.left(failure);
    const updateChannel = vi.fn().mockResolvedValue(updateResult);
    const { store } = configureStore(undefined, undefined, updateChannel);
    await store.load(workspaceId);
    store.select(channelId);

    await expect(
      store.updateSelectedChannel({ name: 'Product Design' })
    ).resolves.toBeNull();

    expect(store.channels()).toEqual([channel]);
    expect(store.selectedChannel()).toEqual(channel);
    expect(store.updateStatus()).toBe('failed');
    expect(store.updateError()).toEqual({
      message: 'You no longer have permission to edit this channel.',
    });

    store.clearUpdateError();
    expect(store.updateStatus()).toBe('idle');
    expect(store.updateError()).toBeNull();
  });

  it('ignores an update after navigation moves away and back', async () => {
    let resolveUpdate:
      | ((result: Either.Either<UpdatedChannelDetails, never>) => void)
      | undefined;
    const updateResult = new Promise<
      Either.Either<UpdatedChannelDetails, never>
    >((resolve) => {
      resolveUpdate = resolve;
    });
    const updateChannel = vi.fn().mockReturnValue(updateResult);
    const { store } = configureStore(
      vi.fn().mockResolvedValue(Either.right([channel, createdChannel])),
      undefined,
      updateChannel
    );
    await store.load(workspaceId);
    store.select(channelId);

    const update = store.updateSelectedChannel({ name: 'Product Design' });
    store.select(createdChannelId);
    store.select(channelId);
    resolveUpdate?.(Either.right(updatedDetails));

    await expect(update).resolves.toBeNull();
    expect(store.channels()).toEqual([channel, createdChannel]);
    expect(store.selectedChannel()).toEqual(channel);
    expect(store.updateStatus()).toBe('idle');
    expect(store.updateError()).toBeNull();
  });
});
