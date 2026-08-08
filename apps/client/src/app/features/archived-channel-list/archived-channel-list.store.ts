import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type {
  ChannelRepositoryReadError,
  RestoreChannelError,
} from '@chat-hub/application/channel';
import type { Channel, ChannelId } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import { ChannelApplicationService } from '@client/core/channel/channel-application.service';
import { initialArchivedChannelListState } from './archived-channel-list.state';

/** Owns workspace-keyed archived-channel discovery independently of navigation. */
export const ArchivedChannelListStore = signalStore(
  withState(initialArchivedChannelListState),
  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
    hasChannels: computed(() => store.channels().length > 0),
    isRestoring: computed(() => store.restorationStatus() === 'restoring'),
  })),
  withMethods(
    (store, channelApplication = inject(ChannelApplicationService)) => {
      let requestVersion = 0;
      let restorationVersion = 0;
      let loading: {
        readonly workspaceId: WorkspaceId;
        readonly promise: Promise<void>;
      } | null = null;

      return {
        clearRestorationError(): void {
          if (store.restorationStatus() === 'failed') {
            patchState(store, {
              restorationStatus: 'idle',
              restorationError: null,
            });
          }
        },

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

          if (workspaceChanged) {
            restorationVersion += 1;
          }

          patchState(store, {
            workspaceId,
            ...(workspaceChanged ? { channels: [] } : {}),
            loadStatus: 'loading',
            error: null,
            ...(workspaceChanged
              ? {
                  restorationStatus: 'idle' as const,
                  restoringChannelId: null,
                  restorationError: null,
                }
              : {}),
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

        /** Restores one listed identity and removes its archived projection. */
        async restore(channelId: ChannelId): Promise<Channel | null> {
          const workspaceId = store.workspaceId();

          if (
            workspaceId === null ||
            store.loadStatus() !== 'loaded' ||
            store.restorationStatus() === 'restoring' ||
            !store.channels().some((channel) => channel.id === channelId)
          ) {
            return null;
          }

          const version = ++restorationVersion;
          patchState(store, {
            restorationStatus: 'restoring',
            restoringChannelId: channelId,
            restorationError: null,
          });

          const result = await channelApplication.restoreChannel({ channelId });

          if (
            version !== restorationVersion ||
            store.workspaceId() !== workspaceId
          ) {
            return null;
          }

          if (Either.isLeft(result)) {
            patchState(store, {
              restorationStatus: 'failed',
              restoringChannelId: null,
              restorationError: presentChannelRestorationError(result.left),
            });
            return null;
          }

          if (result.right.workspaceId !== workspaceId) {
            patchState(store, {
              restorationStatus: 'failed',
              restoringChannelId: null,
              restorationError: {
                message: 'The restored channel belongs to another workspace.',
              },
            });
            return null;
          }

          patchState(store, {
            channels: store
              .channels()
              .filter((channel) => channel.id !== channelId),
            restorationStatus: 'idle',
            restoringChannelId: null,
            restorationError: null,
          });
          return result.right;
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

const presentChannelRestorationError = (error: RestoreChannelError) => ({
  message:
    error._tag === 'ChannelRestoreNotAllowedError'
      ? 'This channel cannot be restored. It may already be active, its workspace may be archived, or your session may not have owner access.'
      : error._tag === 'InvalidChannelDataError'
        ? 'The restored channel data is invalid. Please contact support.'
        : 'The channel could not be restored. Please try again.',
});
