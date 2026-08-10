import { DestroyRef, inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Either } from 'effect';
import type { AnalysisRunStatus } from '@omoikane/domain/analysis';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import { AnalysisRunApiService } from '@client/core/analysis-run/analysis-run-api.service';
import { initialAnalysisRunsState } from './analysis-runs.state';

export const ANALYSIS_RUN_POLL_INTERVAL_MS = 1_000;

const isTerminal = (status: AnalysisRunStatus): boolean =>
  status === 'succeeded' || status === 'failed';

/** Feature-scoped state for starting and observing one current run. */
export const AnalysisRunsStore = signalStore(
  withState(initialAnalysisRunsState),
  withMethods(
    (
      store,
      api = inject(AnalysisRunApiService),
      destroyRef = inject(DestroyRef)
    ) => {
      let revision = 0;
      let pollTimer: ReturnType<typeof setTimeout> | null = null;
      let observationSequence = 0;
      let activeObservation: number | null = null;
      let destroyed = false;

      const stopPolling = (): void => {
        if (pollTimer !== null) {
          clearTimeout(pollTimer);
          pollTimer = null;
        }
      };

      const message = (kind: string): string =>
        kind === 'not-found'
          ? 'This workspace is no longer available for analysis.'
          : kind === 'authentication'
            ? 'Your session can no longer access the analysis server.'
            : 'The Analysis Run service is currently unavailable.';

      const observe = async (expectedRevision: number): Promise<boolean> => {
        const workspaceId = store.workspaceId();
        const run = store.run();
        if (
          destroyed ||
          activeObservation !== null ||
          workspaceId === null ||
          run === null ||
          isTerminal(run.status)
        ) {
          return false;
        }

        const observationId = ++observationSequence;
        activeObservation = observationId;
        const observedRunId = run.id;
        const result = await api.get(workspaceId, observedRunId);
        if (activeObservation === observationId) {
          activeObservation = null;
        }
        if (
          destroyed ||
          expectedRevision !== revision ||
          store.workspaceId() !== workspaceId ||
          store.run()?.id !== observedRunId
        ) {
          return false;
        }

        return Either.match(result, {
          onLeft: (error) => {
            stopPolling();
            patchState(store, {
              status: 'failed',
              error: { message: message(error.kind) },
            });
            return false;
          },
          onRight: (observed) => {
            const terminal = isTerminal(observed.status);
            patchState(store, {
              run: observed,
              status: terminal ? 'idle' : 'observing',
              error: null,
            });
            if (!terminal) {
              pollTimer = setTimeout(() => {
                pollTimer = null;
                void observe(expectedRevision);
              }, ANALYSIS_RUN_POLL_INTERVAL_MS);
            }
            return true;
          },
        });
      };

      const scheduleObservation = (): void => {
        stopPolling();
        const expectedRevision = revision;
        pollTimer = setTimeout(() => {
          pollTimer = null;
          void observe(expectedRevision);
        }, ANALYSIS_RUN_POLL_INTERVAL_MS);
      };

      destroyRef.onDestroy(() => {
        destroyed = true;
        revision += 1;
        activeObservation = null;
        stopPolling();
      });

      return {
        selectWorkspace(workspaceId: WorkspaceId): void {
          if (store.workspaceId() !== workspaceId) {
            revision += 1;
            activeObservation = null;
            stopPolling();
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
          const currentRun = store.run();
          if (
            workspaceId === null ||
            store.status() === 'starting' ||
            (currentRun !== null && !isTerminal(currentRun.status))
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
              const terminal = isTerminal(run.status);
              patchState(store, {
                run,
                status: terminal ? 'idle' : 'observing',
                error: null,
              });
              if (!terminal) {
                scheduleObservation();
              }
              return true;
            },
          });
        },

        async refresh(): Promise<boolean> {
          const workspaceId = store.workspaceId();
          if (workspaceId === null || store.status() === 'starting') {
            return false;
          }
          stopPolling();
          return observe(revision);
        },
      };
    }
  )
);
