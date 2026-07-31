import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import type {
  CreateWorkspaceError,
  CreateWorkspaceInput,
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

      return {
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
          });

          loading = workspaceApplication
            .listAccessibleWorkspaces()
            .then((result) => {
              Either.match(result, {
                onLeft: () => {
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
                  patchState(store, {
                    workspaces,
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

          patchState(store, {
            selectedWorkspaceId: workspaceId,
          });

          return true;
        },

        /**
         * Clears presentation selection without reloading the collection.
         */
        clearSelection(): void {
          patchState(store, {
            selectedWorkspaceId: null,
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
            store.creationStatus() === 'creating'
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
                workspaces: insertWorkspace(store.workspaces(), workspace),
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
      };
    }
  )
);

const insertWorkspace = (
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
