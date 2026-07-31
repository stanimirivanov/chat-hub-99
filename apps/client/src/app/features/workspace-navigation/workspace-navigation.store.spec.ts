import { Either, Schema } from 'effect';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  WorkspaceRepositoryUnavailableError,
  WorkspaceSlugUnavailableError,
  type CreateWorkspaceError,
  type WorkspaceRepositoryReadError,
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

const createdWorkspace: Workspace = {
  id: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    '00000000-0000-4000-8000-000000000003'
  ),
  name: 'Product Design',
  slug: 'product-design',
  description: 'Design collaboration',
};

const configureStore = (
  result: Either.Either<
    readonly Workspace[],
    WorkspaceRepositoryReadError
  > = Either.right([workspace]),
  creationResult: Either.Either<Workspace, CreateWorkspaceError> = Either.right(
    createdWorkspace
  )
) => {
  const service = {
    listAccessibleWorkspaces: vi.fn().mockResolvedValue(result),
    createWorkspace: vi.fn().mockResolvedValue(creationResult),
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

  it('inserts the canonical created workspace into navigation', async () => {
    const { store, service } = configureStore();

    await store.load();

    const result = await store.createWorkspace({
      name: ' Product Design ',
      slug: ' Product-Design ',
      description: ' Design collaboration ',
    });

    expect(service.createWorkspace).toHaveBeenCalledExactlyOnceWith({
      name: ' Product Design ',
      slug: ' Product-Design ',
      description: ' Design collaboration ',
    });
    expect(result).toBe(createdWorkspace);
    expect(store.workspaces()).toEqual([workspace, createdWorkspace]);
    expect(store.creationStatus()).toBe('idle');
    expect(store.creationError()).toBeNull();
  });

  it('retains navigation and exposes an actionable slug conflict', async () => {
    const failure = new WorkspaceSlugUnavailableError({
      slug: 'product-design',
    });
    const { store } = configureStore(
      Either.right([workspace]),
      Either.left(failure)
    );

    await store.load();
    const result = await store.createWorkspace({
      name: 'Product Design',
      slug: 'product-design',
    });

    expect(result).toBeNull();
    expect(store.workspaces()).toEqual([workspace]);
    expect(store.creationStatus()).toBe('failed');
    expect(store.creationError()).toEqual({
      message: 'That workspace URL is already in use.',
    });

    store.clearCreationError();

    expect(store.creationStatus()).toBe('idle');
    expect(store.creationError()).toBeNull();
  });
});
