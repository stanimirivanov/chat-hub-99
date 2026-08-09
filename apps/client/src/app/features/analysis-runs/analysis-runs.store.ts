import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Either } from 'effect';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import { AnalysisRunApiService } from '@client/core/analysis-run/analysis-run-api.service';
import { initialAnalysisRunsState } from './analysis-runs.state';

/** Feature-scoped state for starting and explicitly refreshing one current run. */
export const AnalysisRunsStore = signalStore(
  withState(initialAnalysisRunsState),
  withMethods((store, api = inject(AnalysisRunApiService)) => {
    let revision = 0;

    const message = (kind: string): string =>
      kind === 'not-found'
        ? 'This workspace is no longer available for analysis.'
        : kind === 'authentication'
          ? 'Your session can no longer access the analysis server.'
          : 'The Analysis Run service is currently unavailable.';

    return {
      selectWorkspace(workspaceId: WorkspaceId): void {
        if (store.workspaceId() !== workspaceId) {
          revision += 1;
          patchState(store, {
            workspaceId,
            run: null,
            status: 'idle',
            error: null,
          });
        }
      },

      async start(): Promise<boolean> {
        const workspaceId = store.workspaceId();
        if (
          workspaceId === null ||
          store.status() === 'starting' ||
          store.status() === 'refreshing'
        ) {
          return false;
        }

        const startedAt = revision;
        patchState(store, { status: 'starting', error: null });
        const result = await api.start(workspaceId);
        if (startedAt !== revision) {
          return false;
        }

        return Either.match(result, {
          onLeft: (error) => {
            patchState(store, {
              status: 'failed',
              error: { message: message(error.kind) },
            });
            return false;
          },
          onRight: (run) => {
            patchState(store, { run, status: 'created', error: null });
            return true;
          },
        });
      },

      async refresh(): Promise<boolean> {
        const workspaceId = store.workspaceId();
        const run = store.run();
        if (
          workspaceId === null ||
          run === null ||
          store.status() === 'starting' ||
          store.status() === 'refreshing'
        ) {
          return false;
        }

        const startedAt = revision;
        patchState(store, { status: 'refreshing', error: null });
        const result = await api.get(workspaceId, run.id);
        if (startedAt !== revision) {
          return false;
        }

        return Either.match(result, {
          onLeft: (error) => {
            patchState(store, {
              status: 'failed',
              error: { message: message(error.kind) },
            });
            return false;
          },
          onRight: (observed) => {
            patchState(store, {
              run: observed,
              status: 'created',
              error: null,
            });
            return true;
          },
        });
      },
    };
  })
);
