import { Either, Schema } from 'effect';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  WorkspaceRepositoryUnavailableError,
  type WorkspaceRepositoryError,
} from '@chat-hub/application/workspace';
import { WorkspaceIdSchema, type Workspace } from '@chat-hub/domain/workspace';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';
import { WorkspaceNavigationStore } from './workspace-navigation.store';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);

const inaccessibleWorkspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);

const workspace: Workspace = {
  id: workspaceId,
  name: 'Chat Hub Development',
  slug: 'chat-hub-development',
  description: null,
};

const configureStore = (
  result: Either.Either<
    readonly Workspace[],
    WorkspaceRepositoryError
  > = Either.right([workspace])
) => {
  const service = {
    listAccessibleWorkspaces: vi.fn().mockResolvedValue(result),
  };

  TestBed.configureTestingModule({
    providers: [
      WorkspaceNavigationStore,
      {
        provide: WorkspaceApplicationService,
        useValue: service,
      },
    ],
  });

  return {
    store: TestBed.inject(WorkspaceNavigationStore),
    service,
  };
};

describe('WorkspaceNavigationStore', () => {
  it('loads accessible workspaces once', async () => {
    const { store, service } = configureStore();

    const firstLoad = store.load();
    const concurrentLoad = store.load();

    expect(concurrentLoad).toBe(firstLoad);

    await firstLoad;

    expect(store.workspaces()).toEqual([workspace]);
    expect(store.loadStatus()).toBe('loaded');
    expect(service.listAccessibleWorkspaces).toHaveBeenCalledOnce();

    await store.load();

    expect(service.listAccessibleWorkspaces).toHaveBeenCalledOnce();
  });

  it('exposes a safe error and permits retry', async () => {
    const failure = new WorkspaceRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    });

    const { store, service } = configureStore(Either.left(failure));

    await store.load();

    expect(store.loadStatus()).toBe('failed');
    expect(store.error()).toEqual({
      message: 'Workspaces are currently unavailable. Please try again.',
    });

    service.listAccessibleWorkspaces.mockResolvedValueOnce(
      Either.right([workspace])
    );

    await store.load();

    expect(store.loadStatus()).toBe('loaded');
    expect(store.workspaces()).toEqual([workspace]);
  });

  it('selects only a currently accessible workspace', async () => {
    const { store } = configureStore();

    await store.load();

    expect(store.select(inaccessibleWorkspaceId)).toBe(false);
    expect(store.selectedWorkspace()).toBeNull();

    expect(store.select(workspaceId)).toBe(true);
    expect(store.selectedWorkspace()).toEqual(workspace);

    store.clearSelection();

    expect(store.selectedWorkspace()).toBeNull();
  });
});
