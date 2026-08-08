import { TestBed } from '@angular/core/testing';
import { Either, Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ChannelRepositoryUnavailableError } from '@chat-hub/application/channel';
import {
  ArchivedChannelSchema,
  type ArchivedChannel,
} from '@chat-hub/domain/channel';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import { ChannelApplicationService } from '@client/core/channel/channel-application.service';
import { ArchivedChannelListStore } from './archived-channel-list.store';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const channel: ArchivedChannel = Schema.decodeUnknownSync(
  ArchivedChannelSchema
)({
  id: '00000000-0000-4000-8000-000000000002',
  workspaceId,
  name: 'Planning',
  slug: 'planning',
  description: null,
  archivedAt: '2026-08-08T14:00:00.000Z',
});

const configureStore = (result = Either.right([channel])) => {
  const listArchivedWorkspaceChannels = vi.fn().mockResolvedValue(result);

  TestBed.configureTestingModule({
    providers: [
      ArchivedChannelListStore,
      {
        provide: ChannelApplicationService,
        useValue: { listArchivedWorkspaceChannels },
      },
    ],
  });

  return {
    store: TestBed.inject(ArchivedChannelListStore),
    listArchivedWorkspaceChannels,
  };
};

describe('ArchivedChannelListStore', () => {
  it('loads the owner-visible archive projection', async () => {
    const { store, listArchivedWorkspaceChannels } = configureStore();

    await store.load(workspaceId);

    expect(store.channels()).toEqual([channel]);
    expect(store.loadStatus()).toBe('loaded');
    expect(listArchivedWorkspaceChannels).toHaveBeenCalledExactlyOnceWith(
      workspaceId
    );
  });

  it('presents a safe retryable repository failure', async () => {
    const { store } = configureStore(
      Either.left(new ChannelRepositoryUnavailableError({ cause: 'offline' }))
    );

    await store.load(workspaceId);

    expect(store.loadStatus()).toBe('failed');
    expect(store.error()?.message).toContain('could not be loaded');
  });

  it('reloads when active channel identities change', async () => {
    const { store, listArchivedWorkspaceChannels } = configureStore();

    await store.load(workspaceId);
    await store.load(workspaceId, true);

    expect(listArchivedWorkspaceChannels).toHaveBeenCalledTimes(2);
  });
});
