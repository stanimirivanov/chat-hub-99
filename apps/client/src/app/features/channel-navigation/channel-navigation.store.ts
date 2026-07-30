import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { ChannelId } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import { ChannelApplicationService } from '@client/core/channel/channel-application.service';
import { initialChannelNavigationState } from './channel-navigation.state';

/**
 * Owns channel discovery and selection for one workspace navigation feature.
 */
export const ChannelNavigationStore = signalStore(
  withState(initialChannelNavigationState),

  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
    hasChannels: computed(() => store.channels().length > 0),
    selectedChannel: computed(() => {
      const selectedChannelId = store.selectedChannelId();

      return (
        store.channels().find((channel) => channel.id === selectedChannelId) ??
        null
      );
    }),
  })),

  withMethods(
    (store, channelApplication = inject(ChannelApplicationService)) => {
      let requestVersion = 0;
      let activeRequest: {
        readonly workspaceId: WorkspaceId;
        readonly promise: Promise<void>;
      } | null = null;

      return {
        /**
         * Loads channels for the current workspace.
         *
         * Calls for the same workspace share an in-flight request. Selecting a
         * different workspace clears the old collection immediately, and a
         * late result from the previous request cannot overwrite newer state.
         */
        load(workspaceId: WorkspaceId): Promise<void> {
          if (
            store.workspaceId() === workspaceId &&
            store.loadStatus() === 'loaded'
          ) {
            return Promise.resolve();
          }

          if (activeRequest?.workspaceId === workspaceId) {
            return activeRequest.promise;
          }

          const version = ++requestVersion;

          patchState(store, {
            workspaceId,
            channels: [],
            selectedChannelId: null,
            loadStatus: 'loading',
            error: null,
          });

          const promise = channelApplication
            .listWorkspaceChannels(workspaceId)
            .then((result) => {
              if (version !== requestVersion) {
                return;
              }

              Either.match(result, {
                onLeft: () => {
                  patchState(store, {
                    channels: [],
                    selectedChannelId: null,
                    loadStatus: 'failed',
                    error: {
                      message:
                        'Channels are currently unavailable. Please try again.',
                    },
                  });
                },
                onRight: (channels) => {
                  patchState(store, {
                    channels,
                    selectedChannelId: null,
                    loadStatus: 'loaded',
                    error: null,
                  });
                },
              });
            })
            .finally(() => {
              if (version === requestVersion) {
                activeRequest = null;
              }
            });

          activeRequest = { workspaceId, promise };
          return promise;
        },

        /**
         * Selects a channel only when it belongs to the loaded collection.
         */
        select(channelId: ChannelId): boolean {
          if (!store.channels().some((channel) => channel.id === channelId)) {
            return false;
          }

          patchState(store, { selectedChannelId: channelId });
          return true;
        },
      };
    }
  )
);
