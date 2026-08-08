import { TestBed } from '@angular/core/testing';
import { Either, Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceRepositoryUnavailableError } from '@chat-hub/application/workspace';
import {
  ArchivedWorkspaceSchema,
  type ArchivedWorkspace,
} from '@chat-hub/domain/workspace';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';
import { ArchivedWorkspaceListStore } from './archived-workspace-list.store';

const workspace: ArchivedWorkspace = Schema.decodeUnknownSync(
  ArchivedWorkspaceSchema
)({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Archived Chat Hub',
  slug: 'archived-chat-hub',
  description: null,
  archivedAt: '2026-08-08T09:00:00.000Z',
});

const configureStore = (result = Either.right([workspace])) => {
  const listArchivedWorkspaces = vi.fn().mockResolvedValue(result);

  TestBed.configureTestingModule({
    providers: [
      ArchivedWorkspaceListStore,
      {
        provide: WorkspaceApplicationService,
        useValue: { listArchivedWorkspaces },
      },
    ],
  });

  return {
    store: TestBed.inject(ArchivedWorkspaceListStore),
    listArchivedWorkspaces,
  };
};

describe('ArchivedWorkspaceListStore', () => {
  it('loads archived projections without active selection state', async () => {
    const { store, listArchivedWorkspaces } = configureStore();

    await store.load();

    expect(store.workspaces()).toEqual([workspace]);
    expect(store.loadStatus()).toBe('loaded');
    expect(store.hasWorkspaces()).toBe(true);
    expect(listArchivedWorkspaces).toHaveBeenCalledOnce();
  });

  it('presents a safe retryable read failure', async () => {
    const { store } = configureStore(
      Either.left(new WorkspaceRepositoryUnavailableError({ cause: 'offline' }))
    );

    await store.load();

    expect(store.loadStatus()).toBe('failed');
    expect(store.error()?.message).toContain('could not be loaded');
  });

  it('does not reload an already loaded collection', async () => {
    const { store, listArchivedWorkspaces } = configureStore();

    await store.load();
    await store.load();

    expect(listArchivedWorkspaces).toHaveBeenCalledOnce();
  });

  it('reloads after a local archive changes the projection', async () => {
    const { store, listArchivedWorkspaces } = configureStore();

    await store.load();
    await store.load(true);

    expect(listArchivedWorkspaces).toHaveBeenCalledTimes(2);
  });
});
