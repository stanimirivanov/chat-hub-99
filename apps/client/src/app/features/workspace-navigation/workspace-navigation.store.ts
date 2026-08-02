import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import type {
  ArchiveWorkspaceError,
  CreateWorkspaceError,
  CreateWorkspaceInput,
  LeaveWorkspaceError,
  UpdateWorkspaceError,
  UpdateWorkspaceInput,
} from '@chat-hub/application/workspace';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { Workspace, WorkspaceId } from '@chat-hub/domain/workspace';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';
import { initialWorkspaceNavigationState } from './workspace-navigation.state';

/**
 * Owns accessible workspace discovery and the current navigation selection.
 */
export const WorkspaceNavigationStore = signalStore(
  withState(initialWorkspaceNavigationState),

  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
    isCreating: computed(() => store.creationStatus() === 'creating'),
    isUpdating: computed(() => store.updateStatus() === 'updating'),
    isArchiving: computed(() => store.archiveStatus() === 'archiving'),
    isLeaving: computed(() => store.departureStatus() === 'leaving'),
    hasWorkspaces: computed(() => store.workspaces().length > 0),
    selectedWorkspace: computed(() => {
      const selectedWorkspaceId = store.selectedWorkspaceId();

      return (
        store
          .workspaces()
          .find((workspace) => workspace.id === selectedWorkspaceId) ?? null
      );
    }),
  })),

  withMethods(
    (store, workspaceApplication = inject(WorkspaceApplicationService)) => {
      let loading: Promise<void> | null = null;
      let selectionVersion = 0;
      const locallyIncludedWorkspaces = new Map<WorkspaceId, Workspace>();

      const selectionIsObsolete = (
        workspaceId: WorkspaceId,
        version: number
      ): boolean =>
        version !== selectionVersion ||
        store.selectedWorkspaceId() !== workspaceId;

      const removeAccessibleWorkspace = (workspaceId: WorkspaceId): void => {
        locallyIncludedWorkspaces.delete(workspaceId);
        const targetStillSelected = store.selectedWorkspaceId() === workspaceId;

        if (targetStillSelected) {
          selectionVersion += 1;
        }

        patchState(store, {
          workspaces: store
            .workspaces()
            .filter((workspace) => workspace.id !== workspaceId),
          ...(targetStillSelected ? { selectedWorkspaceId: null } : {}),
        });
      };

      return {
        /**
         * Reconciles access granted by invitation acceptance, including while
         * the initial workspace query is still in flight.
         */
        includeAccessibleWorkspace(workspace: Workspace): void {
          locallyIncludedWorkspaces.set(workspace.id, workspace);

          if (store.loadStatus() === 'loaded') {
            patchState(store, {
              workspaces: upsertWorkspace(store.workspaces(), workspace),
            });
          }
        },

        /**
         * Loads accessible workspaces once. Concurrent calls share the active
         * request, while failed loads may be retried.
         */
        load(): Promise<void> {
          if (store.loadStatus() === 'loaded') {
            return Promise.resolve();
          }

          if (loading !== null) {
            return loading;
          }

          patchState(store, {
            loadStatus: 'loading',
            error: null,
            creationStatus: 'idle',
            creationError: null,
            updateStatus: 'idle',
            updateError: null,
            archiveStatus: 'idle',
            archivingWorkspaceId: null,
            archiveError: null,
            departureStatus: 'idle',
            departingWorkspaceId: null,
            departureError: null,
          });

          loading = workspaceApplication
            .listAccessibleWorkspaces()
            .then((result) => {
              Either.match(result, {
                onLeft: () => {
                  selectionVersion += 1;
                  patchState(store, {
                    workspaces: [],
                    selectedWorkspaceId: null,
                    loadStatus: 'failed',
                    error: {
                      message:
                        'Workspaces are currently unavailable. Please try again.',
                    },
                  });
                },
                onRight: (workspaces) => {
                  selectionVersion += 1;
                  patchState(store, {
                    workspaces: [...workspaces].reduce(
                      (result, workspace) => upsertWorkspace(result, workspace),
                      [
                        ...locallyIncludedWorkspaces.values(),
                      ] as readonly Workspace[]
                    ),
                    selectedWorkspaceId: null,
                    loadStatus: 'loaded',
                    error: null,
                  });
                },
              });
            })
            .finally(() => {
              loading = null;
            });

          return loading;
        },

        /**
         * Selects a workspace from the currently loaded accessible collection.
         */
        select(workspaceId: WorkspaceId): boolean {
          if (
            !store
              .workspaces()
              .some((workspace) => workspace.id === workspaceId)
          ) {
            return false;
          }

          const selectionChanged = store.selectedWorkspaceId() !== workspaceId;

          if (selectionChanged) {
            selectionVersion += 1;
          }

          patchState(store, {
            selectedWorkspaceId: workspaceId,
            ...(selectionChanged
              ? { updateStatus: 'idle' as const, updateError: null }
              : {}),
            ...(selectionChanged && store.archiveStatus() !== 'archiving'
              ? {
                  archiveStatus: 'idle' as const,
                  archivingWorkspaceId: null,
                  archiveError: null,
                }
              : {}),
            ...(selectionChanged && store.departureStatus() !== 'leaving'
              ? {
                  departureStatus: 'idle' as const,
                  departingWorkspaceId: null,
                  departureError: null,
                }
              : {}),
          });

          return true;
        },

        /**
         * Clears presentation selection without reloading the collection.
         */
        clearSelection(): void {
          if (store.selectedWorkspaceId() !== null) {
            selectionVersion += 1;
          }

          patchState(store, {
            selectedWorkspaceId: null,
            updateStatus: 'idle',
            updateError: null,
            ...(store.archiveStatus() === 'archiving'
              ? {}
              : {
                  archiveStatus: 'idle' as const,
                  archivingWorkspaceId: null,
                  archiveError: null,
                }),
            ...(store.departureStatus() === 'leaving'
              ? {}
              : {
                  departureStatus: 'idle' as const,
                  departingWorkspaceId: null,
                  departureError: null,
                }),
          });
        },

        /**
         * Creates a workspace and inserts the canonical result into navigation.
         */
        async createWorkspace(
          input: CreateWorkspaceInput
        ): Promise<Workspace | null> {
          if (
            store.loadStatus() !== 'loaded' ||
            store.creationStatus() === 'creating' ||
            store.updateStatus() === 'updating' ||
            store.archiveStatus() === 'archiving' ||
            store.departureStatus() === 'leaving'
          ) {
            return null;
          }

          patchState(store, {
            creationStatus: 'creating',
            creationError: null,
          });

          const result = await workspaceApplication.createWorkspace(input);

          return Either.match(result, {
            onLeft: (error) => {
              patchState(store, {
                creationStatus: 'failed',
                creationError: toWorkspaceCreationError(error),
              });

              return null;
            },
            onRight: (workspace) => {
              patchState(store, {
                workspaces: upsertWorkspace(store.workspaces(), workspace),
                creationStatus: 'idle',
                creationError: null,
              });

              return workspace;
            },
          });
        },

        clearCreationError(): void {
          patchState(store, {
            creationStatus: 'idle',
            creationError: null,
          });
        },

        /**
         * Replaces the selected workspace with the canonical application
         * result. A selection generation prevents a late response from
         * updating a workspace after navigation moved elsewhere and back.
         */
        async updateSelectedWorkspace(
          details: Omit<UpdateWorkspaceInput, 'workspaceId'>
        ): Promise<Workspace | null> {
          const workspaceId = store.selectedWorkspaceId();

          if (
            workspaceId === null ||
            store.loadStatus() !== 'loaded' ||
            store.updateStatus() === 'updating' ||
            store.creationStatus() === 'creating' ||
            store.archiveStatus() === 'archiving' ||
            store.departureStatus() === 'leaving'
          ) {
            return null;
          }

          const version = selectionVersion;
          patchState(store, {
            updateStatus: 'updating',
            updateError: null,
          });

          const result = await workspaceApplication.updateWorkspace({
            workspaceId,
            ...details,
          });

          if (selectionIsObsolete(workspaceId, version)) {
            return null;
          }

          return Either.match(result, {
            onLeft: (error) => {
              patchState(store, {
                updateStatus: 'failed',
                updateError: toWorkspaceUpdateError(error),
              });

              return null;
            },
            onRight: (workspace) => {
              patchState(store, {
                workspaces: upsertWorkspace(store.workspaces(), workspace),
                updateStatus: 'idle',
                updateError: null,
              });

              return workspace;
            },
          });
        },

        clearUpdateError(): void {
          if (store.updateStatus() !== 'updating') {
            patchState(store, {
              updateStatus: 'idle',
              updateError: null,
            });
          }
        },

        /**
         * Archives the selected workspace through one serialized command.
         *
         * A successful provider mutation is reconciled by stable identity even
         * after navigation changes. Selection is cleared only when the target
         * is still selected; failures from an obsolete selection are hidden.
         */
        async archiveSelectedWorkspace(): Promise<WorkspaceId | null> {
          const workspaceId = store.selectedWorkspaceId();

          if (
            workspaceId === null ||
            store.loadStatus() !== 'loaded' ||
            store.creationStatus() === 'creating' ||
            store.updateStatus() === 'updating' ||
            store.archiveStatus() === 'archiving' ||
            store.departureStatus() === 'leaving'
          ) {
            return null;
          }

          const version = selectionVersion;
          patchState(store, {
            archiveStatus: 'archiving',
            archivingWorkspaceId: workspaceId,
            archiveError: null,
          });

          const result = await workspaceApplication.archiveWorkspace({
            workspaceId,
          });

          if (Either.isLeft(result)) {
            if (selectionIsObsolete(workspaceId, version)) {
              patchState(store, {
                archiveStatus: 'idle',
                archivingWorkspaceId: null,
                archiveError: null,
              });
              return null;
            }

            patchState(store, {
              archiveStatus: 'failed',
              archivingWorkspaceId: null,
              archiveError: toWorkspaceArchiveError(result.left),
            });
            return null;
          }

          removeAccessibleWorkspace(workspaceId);
          patchState(store, {
            archiveStatus: 'idle',
            archivingWorkspaceId: null,
            archiveError: null,
          });

          return workspaceId;
        },

        clearArchiveError(): void {
          if (store.archiveStatus() !== 'archiving') {
            patchState(store, {
              archiveStatus: 'idle',
              archivingWorkspaceId: null,
              archiveError: null,
            });
          }
        },

        /**
         * Removes the authenticated user's membership through one serialized
         * command and reconciles the accessible collection by stable identity.
         * A late success is retained, while an obsolete failure is hidden.
         */
        async leaveSelectedWorkspace(): Promise<WorkspaceId | null> {
          const workspaceId = store.selectedWorkspaceId();

          if (
            workspaceId === null ||
            store.loadStatus() !== 'loaded' ||
            store.creationStatus() === 'creating' ||
            store.updateStatus() === 'updating' ||
            store.archiveStatus() === 'archiving' ||
            store.departureStatus() === 'leaving'
          ) {
            return null;
          }

          const version = selectionVersion;
          patchState(store, {
            departureStatus: 'leaving',
            departingWorkspaceId: workspaceId,
            departureError: null,
          });

          const result = await workspaceApplication.leaveWorkspace({
            workspaceId,
          });

          if (Either.isLeft(result)) {
            if (selectionIsObsolete(workspaceId, version)) {
              patchState(store, {
                departureStatus: 'idle',
                departingWorkspaceId: null,
                departureError: null,
              });
              return null;
            }

            patchState(store, {
              departureStatus: 'failed',
              departingWorkspaceId: null,
              departureError: toWorkspaceDepartureError(result.left),
            });
            return null;
          }

          removeAccessibleWorkspace(workspaceId);
          patchState(store, {
            departureStatus: 'idle',
            departingWorkspaceId: null,
            departureError: null,
          });

          return workspaceId;
        },

        clearDepartureError(): void {
          if (store.departureStatus() !== 'leaving') {
            patchState(store, {
              departureStatus: 'idle',
              departingWorkspaceId: null,
              departureError: null,
            });
          }
        },
      };
    }
  )
);

const upsertWorkspace = (
  workspaces: readonly Workspace[],
  created: Workspace
): readonly Workspace[] =>
  [
    ...workspaces.filter((workspace) => workspace.id !== created.id),
    created,
  ].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
  );

const toWorkspaceCreationError = (
  error: CreateWorkspaceError
): { readonly message: string } => {
  switch (error._tag) {
    case 'InvalidWorkspaceCreationInputError':
      return {
        message:
          error.field === 'name'
            ? 'Enter a workspace name.'
            : error.field === 'slug'
              ? 'Use lowercase letters, numbers, and single hyphens for the workspace URL.'
              : 'Check the workspace description and try again.',
      };

    case 'WorkspaceSlugUnavailableError':
      return {
        message: 'That workspace URL is already in use.',
      };

    default:
      return {
        message: 'The workspace could not be created. Please try again.',
      };
  }
};

const toWorkspaceUpdateError = (
  error: UpdateWorkspaceError
): { readonly message: string } => {
  switch (error._tag) {
    case 'InvalidWorkspaceUpdateInputError':
      return {
        message:
          error.field === 'name'
            ? 'Enter a workspace name.'
            : error.field === 'slug'
              ? 'Use lowercase letters, numbers, and single hyphens for the workspace URL.'
              : error.field === 'description'
                ? 'Check the workspace description and try again.'
                : 'The selected workspace is invalid.',
      };
    case 'WorkspaceSlugUnavailableError':
      return { message: 'That workspace URL is already in use.' };
    case 'WorkspaceUpdateNotAllowedError':
      return {
        message: 'You no longer have permission to edit this workspace.',
      };
    case 'InvalidWorkspaceDataError':
    case 'WorkspaceRepositoryUnavailableError':
      return {
        message: 'The workspace could not be updated. Please try again.',
      };
  }
};

const toWorkspaceArchiveError = (
  error: ArchiveWorkspaceError
): { readonly message: string } => {
  switch (error._tag) {
    case 'WorkspaceArchiveNotAllowedError':
      return {
        message: 'You no longer have permission to archive this workspace.',
      };
    case 'InvalidWorkspaceArchiveInputError':
    case 'InvalidWorkspaceDataError':
    case 'WorkspaceRepositoryUnavailableError':
      return {
        message: 'The workspace could not be archived. Please try again.',
      };
  }
};

const toWorkspaceDepartureError = (
  error: LeaveWorkspaceError
): { readonly message: string } => {
  switch (error._tag) {
    case 'WorkspaceLastOwnerDepartureError':
      return {
        message: 'Assign another active owner before leaving this workspace.',
      };
    case 'WorkspaceDepartureNotAllowedError':
      return {
        message: 'You can no longer leave this workspace.',
      };
    case 'InvalidWorkspaceDepartureInputError':
    case 'InvalidWorkspaceMemberDataError':
    case 'WorkspaceRepositoryUnavailableError':
      return {
        message: 'The workspace could not be left. Please try again.',
      };
  }
};
