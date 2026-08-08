import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { ChannelRepositoryReadError } from '@chat-hub/application/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import { ChannelApplicationService } from '@client/core/channel/channel-application.service';
import { initialArchivedChannelListState } from './archived-channel-list.state';

/** Owns workspace-keyed archived-channel discovery independently of navigation. */
export const ArchivedChannelListStore = signalStore(
  withState(initialArchivedChannelListState),
  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
    hasChannels: computed(() => store.channels().length > 0),
  })),
  withMethods(
    (store, channelApplication = inject(ChannelApplicationService)) => {
      let requestVersion = 0;
      let loading: {
        readonly workspaceId: WorkspaceId;
        readonly promise: Promise<void>;
      } | null = null;

      return {
        /** Loads one owner-visible archive projection and rejects stale results. */
        load(workspaceId: WorkspaceId, force = false): Promise<void> {
          if (
            !force &&
            store.workspaceId() === workspaceId &&
            store.loadStatus() === 'loaded'
          ) {
            return Promise.resolve();
          }

          if (!force && loading?.workspaceId === workspaceId) {
            return loading.promise;
          }

          const workspaceChanged = store.workspaceId() !== workspaceId;
          const version = ++requestVersion;

          patchState(store, {
            workspaceId,
            ...(workspaceChanged ? { channels: [] } : {}),
            loadStatus: 'loading',
            error: null,
          });

          const promise = channelApplication
            .listArchivedWorkspaceChannels(workspaceId)
            .then((result) => {
              if (
                version !== requestVersion ||
                store.workspaceId() !== workspaceId
              ) {
                return;
              }

              if (Either.isLeft(result)) {
                patchState(store, {
                  channels: [],
                  loadStatus: 'failed',
                  error: presentArchivedChannelError(result.left),
                });
                return;
              }

              patchState(store, {
                channels: result.right,
                loadStatus: 'loaded',
                error: null,
              });
            })
            .finally(() => {
              if (version === requestVersion) {
                loading = null;
              }
            });

          loading = { workspaceId, promise };
          return promise;
        },
      };
    }
  )
);

const presentArchivedChannelError = (error: ChannelRepositoryReadError) => ({
  message:
    error._tag === 'InvalidChannelDataError'
      ? 'Archived channel data is invalid. Please contact support.'
      : 'Archived channels could not be loaded. Please try again.',
});
