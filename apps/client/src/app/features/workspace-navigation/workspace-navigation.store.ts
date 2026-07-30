import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';
import { initialWorkspaceNavigationState } from './workspace-navigation.state';

/**
 * Owns accessible workspace discovery and the current navigation selection.
 */
export const WorkspaceNavigationStore = signalStore(
  withState(initialWorkspaceNavigationState),

  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
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
      };
    }
  )
);
