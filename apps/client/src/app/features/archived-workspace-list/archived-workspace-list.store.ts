import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { WorkspaceRepositoryReadError } from '@chat-hub/application/workspace';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';
import { initialArchivedWorkspaceListState } from './archived-workspace-list.state';

/** Owns the independent request lifecycle for archived-workspace discovery. */
export const ArchivedWorkspaceListStore = signalStore(
  withState(initialArchivedWorkspaceListState),
  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
    hasWorkspaces: computed(() => store.workspaces().length > 0),
  })),
  withMethods(
    (store, workspaceApplication = inject(WorkspaceApplicationService)) => {
      let loading: Promise<void> | null = null;

      return {
        /**
         * Loads once and coalesces concurrent calls. `force` reconciles a
         * successful local archive without coupling this store to commands.
         */
        load(force = false): Promise<void> {
          if (!force && store.loadStatus() === 'loaded') {
            return Promise.resolve();
          }

          if (loading !== null) {
            return loading;
          }

          patchState(store, { loadStatus: 'loading', error: null });

          loading = workspaceApplication
            .listArchivedWorkspaces()
            .then((result) => {
              if (Either.isLeft(result)) {
                patchState(store, {
                  workspaces: [],
                  loadStatus: 'failed',
                  error: presentArchivedWorkspaceError(result.left),
                });
                return;
              }

              patchState(store, {
                workspaces: result.right,
                loadStatus: 'loaded',
                error: null,
              });
            })
            .finally(() => {
              loading = null;
            });

          return loading;
        },
      };
    }
  )
);

const presentArchivedWorkspaceError = (
  error: WorkspaceRepositoryReadError
) => ({
  message:
    error._tag === 'InvalidWorkspaceDataError'
      ? 'Archived workspace data is invalid. Please contact support.'
      : 'Archived workspaces could not be loaded. Please try again.',
});
