import { Either, Schema } from 'effect';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  WorkspaceArchiveNotAllowedError,
  WorkspaceRepositoryUnavailableError,
  WorkspaceSlugUnavailableError,
  WorkspaceUpdateNotAllowedError,
  type CreateWorkspaceError,
  type ArchiveWorkspaceError,
  type UpdateWorkspaceError,
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

const updatedWorkspace: Workspace = {
  ...workspace,
  name: 'Chat Hub Community',
  slug: 'chat-hub-community',
  description: 'Updated collaboration space',
};

const otherWorkspace: Workspace = {
  id: inaccessibleWorkspaceId,
  name: 'Other Workspace',
  slug: 'other-workspace',
  description: null,
};

const configureStore = (
  result: Either.Either<
    readonly Workspace[],
    WorkspaceRepositoryReadError
  > = Either.right([workspace]),
  creationResult: Either.Either<Workspace, CreateWorkspaceError> = Either.right(
    createdWorkspace
  ),
  updateResult: Either.Either<Workspace, UpdateWorkspaceError> = Either.right(
    updatedWorkspace
  ),
  archiveResult: Either.Either<void, ArchiveWorkspaceError> = Either.right(
    undefined
  )
) => {
  const service = {
    listAccessibleWorkspaces: vi.fn().mockResolvedValue(result),
    createWorkspace: vi.fn().mockResolvedValue(creationResult),
    updateWorkspace: vi.fn().mockResolvedValue(updateResult),
    archiveWorkspace: vi.fn().mockResolvedValue(archiveResult),
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

  it('replaces the selected workspace with the canonical update result', async () => {
    const { store, service } = configureStore();
    await store.load();
    store.select(workspace.id);

    const update = store.updateSelectedWorkspace({
      name: ' Chat Hub Community ',
      slug: ' Chat-Hub-Community ',
      description: ' Updated collaboration space ',
    });

    expect(store.isUpdating()).toBe(true);
    await expect(update).resolves.toBe(updatedWorkspace);
    expect(service.updateWorkspace).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
      name: ' Chat Hub Community ',
      slug: ' Chat-Hub-Community ',
      description: ' Updated collaboration space ',
    });
    expect(store.workspaces()).toEqual([updatedWorkspace]);
    expect(store.selectedWorkspace()).toBe(updatedWorkspace);
    expect(store.updateStatus()).toBe('idle');
    expect(store.updateError()).toBeNull();
  });

  it.each([
    [
      new WorkspaceSlugUnavailableError({ slug: updatedWorkspace.slug }),
      'That workspace URL is already in use.',
    ],
    [
      new WorkspaceUpdateNotAllowedError({ workspaceId: workspace.id }),
      'You no longer have permission to edit this workspace.',
    ],
  ])('retains navigation and presents $._tag', async (failure, message) => {
    const { store } = configureStore(
      Either.right([workspace]),
      undefined,
      Either.left(failure)
    );
    await store.load();
    store.select(workspace.id);

    await expect(
      store.updateSelectedWorkspace({
        name: updatedWorkspace.name,
        slug: updatedWorkspace.slug,
        description: updatedWorkspace.description,
      })
    ).resolves.toBeNull();

    expect(store.workspaces()).toEqual([workspace]);
    expect(store.updateStatus()).toBe('failed');
    expect(store.updateError()).toEqual({ message });

    store.clearUpdateError();
    expect(store.updateStatus()).toBe('idle');
    expect(store.updateError()).toBeNull();
  });

  it('ignores an update result after selection moves elsewhere and back', async () => {
    let resolveUpdate:
      | ((result: Either.Either<Workspace, never>) => void)
      | undefined;
    const updateResult = new Promise<Either.Either<Workspace, never>>(
      (resolve) => {
        resolveUpdate = resolve;
      }
    );
    const { store, service } = configureStore(
      Either.right([workspace, otherWorkspace])
    );
    service.updateWorkspace.mockReturnValue(updateResult);
    await store.load();
    store.select(workspace.id);

    const staleUpdate = store.updateSelectedWorkspace({
      name: updatedWorkspace.name,
      slug: updatedWorkspace.slug,
      description: updatedWorkspace.description,
    });
    store.select(otherWorkspace.id);
    store.select(workspace.id);
    resolveUpdate?.(Either.right(updatedWorkspace));

    await expect(staleUpdate).resolves.toBeNull();
    expect(store.workspaces()).toEqual([workspace, otherWorkspace]);
    expect(store.updateStatus()).toBe('idle');
  });

  it('removes an archived workspace and clears its selection', async () => {
    const { store, service } = configureStore(
      Either.right([workspace, otherWorkspace])
    );
    await store.load();
    store.select(workspace.id);

    const archive = store.archiveSelectedWorkspace();

    expect(store.isArchiving()).toBe(true);
    expect(store.archivingWorkspaceId()).toBe(workspace.id);
    await expect(archive).resolves.toBe(workspace.id);
    expect(service.archiveWorkspace).toHaveBeenCalledExactlyOnceWith({
      workspaceId: workspace.id,
    });
    expect(store.workspaces()).toEqual([otherWorkspace]);
    expect(store.selectedWorkspace()).toBeNull();
    expect(store.archiveStatus()).toBe('idle');
    expect(store.archiveError()).toBeNull();
  });

  it('retains navigation and presents a forbidden archive', async () => {
    const failure = new WorkspaceArchiveNotAllowedError({
      workspaceId: workspace.id,
    });
    const { store } = configureStore(
      Either.right([workspace]),
      undefined,
      undefined,
      Either.left(failure)
    );
    await store.load();
    store.select(workspace.id);

    await expect(store.archiveSelectedWorkspace()).resolves.toBeNull();

    expect(store.workspaces()).toEqual([workspace]);
    expect(store.selectedWorkspace()).toBe(workspace);
    expect(store.archiveStatus()).toBe('failed');
    expect(store.archiveError()).toEqual({
      message: 'You no longer have permission to archive this workspace.',
    });

    store.clearArchiveError();
    expect(store.archiveStatus()).toBe('idle');
    expect(store.archiveError()).toBeNull();
  });

  it('reconciles a successful archive without disturbing a newer selection', async () => {
    let resolveArchive:
      | ((result: Either.Either<void, never>) => void)
      | undefined;
    const archiveResult = new Promise<Either.Either<void, never>>((resolve) => {
      resolveArchive = resolve;
    });
    const { store, service } = configureStore(
      Either.right([workspace, otherWorkspace])
    );
    service.archiveWorkspace.mockReturnValue(archiveResult);
    await store.load();
    store.select(workspace.id);

    const archive = store.archiveSelectedWorkspace();
    store.select(otherWorkspace.id);
    resolveArchive?.(Either.right(undefined));

    await expect(archive).resolves.toBe(workspace.id);
    expect(store.workspaces()).toEqual([otherWorkspace]);
    expect(store.selectedWorkspace()).toBe(otherWorkspace);
    expect(store.archiveStatus()).toBe('idle');
  });

  it('discards an archive failure after selection changes', async () => {
    const failure = new WorkspaceArchiveNotAllowedError({
      workspaceId: workspace.id,
    });
    let resolveArchive:
      | ((result: Either.Either<void, ArchiveWorkspaceError>) => void)
      | undefined;
    const archiveResult = new Promise<
      Either.Either<void, ArchiveWorkspaceError>
    >((resolve) => {
      resolveArchive = resolve;
    });
    const { store, service } = configureStore(
      Either.right([workspace, otherWorkspace])
    );
    service.archiveWorkspace.mockReturnValue(archiveResult);
    await store.load();
    store.select(workspace.id);

    const archive = store.archiveSelectedWorkspace();
    store.select(otherWorkspace.id);
    resolveArchive?.(Either.left(failure));

    await expect(archive).resolves.toBeNull();
    expect(store.workspaces()).toEqual([workspace, otherWorkspace]);
    expect(store.selectedWorkspace()).toBe(otherWorkspace);
    expect(store.archiveStatus()).toBe('idle');
    expect(store.archiveError()).toBeNull();
  });
});
