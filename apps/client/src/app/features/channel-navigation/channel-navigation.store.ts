import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import type {
  CreateChannelError,
  CreateChannelInput,
} from '@chat-hub/application/channel';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { Channel, ChannelId } from '@chat-hub/domain/channel';
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
    isCreating: computed(() => store.creationStatus() === 'creating'),
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
          const workspaceChanged = store.workspaceId() !== workspaceId;

          patchState(store, {
            workspaceId,
            channels: [],
            selectedChannelId: null,
            loadStatus: 'loading',
            error: null,
            ...(workspaceChanged
              ? { creationStatus: 'idle', creationError: null }
              : {}),
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

        /**
         * Clears presentation selection without reloading the collection.
         */
        clearSelection(): void {
          patchState(store, {
            selectedChannelId: null,
          });
        },

        /**
         * Creates a channel in the loaded workspace and adds the validated
         * result without changing selection. Route navigation remains the
         * component's responsibility and is therefore the selection source.
         */
        async createChannel(
          input: Omit<CreateChannelInput, 'workspaceId'>
        ): Promise<Channel | null> {
          const workspaceId = store.workspaceId();

          if (
            workspaceId === null ||
            store.loadStatus() !== 'loaded' ||
            store.creationStatus() === 'creating'
          ) {
            return null;
          }

          patchState(store, {
            creationStatus: 'creating',
            creationError: null,
          });

          const result = await channelApplication.createChannel({
            ...input,
            workspaceId,
          });

          if (store.workspaceId() !== workspaceId) {
            return null;
          }

          return Either.match(result, {
            onLeft: (error) => {
              patchState(store, {
                creationStatus: 'failed',
                creationError: toChannelCreationError(error),
              });

              return null;
            },
            onRight: (channel) => {
              patchState(store, {
                channels: insertChannel(store.channels(), channel),
                creationStatus: 'idle',
                creationError: null,
              });

              return channel;
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

const insertChannel = (
  channels: readonly Channel[],
  created: Channel
): readonly Channel[] =>
  [...channels.filter((channel) => channel.id !== created.id), created].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
  );

const toChannelCreationError = (
  error: CreateChannelError
): { readonly message: string } => {
  switch (error._tag) {
    case 'InvalidChannelCreationInputError':
      return {
        message:
          error.field === 'name'
            ? 'Enter a channel name.'
            : error.field === 'slug'
              ? 'Use lowercase letters, numbers, and single hyphens for the channel URL.'
              : error.field === 'workspaceId'
                ? 'Select an active workspace before creating a channel.'
                : 'Check the channel description and try again.',
      };

    case 'ChannelSlugUnavailableError':
      return {
        message: 'That channel URL is already in use in this workspace.',
      };

    case 'ChannelCreationNotAllowedError':
      return {
        message: 'You no longer have permission to create channels here.',
      };

    default:
      return {
        message: 'The channel could not be created. Please try again.',
      };
  }
};
