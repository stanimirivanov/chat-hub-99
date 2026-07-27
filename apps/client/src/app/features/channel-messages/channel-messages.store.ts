import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { ChannelId } from '@chat-hub/domain/message';
import { MessageApplicationService } from '../../core/message/message-application.service';
import { appendUniqueMessages } from './append-unique-messages';
import { initialChannelMessagesState } from './channel-messages.state';
import { toChannelMessagesError } from './to-channel-messages-error';

const MESSAGE_PAGE_SIZE = 50;

/**
 * Owns message-list state for the currently selected channel.
 */
export const ChannelMessagesStore = signalStore(
  withState(initialChannelMessagesState),

  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),

    isLoadingOlder: computed(() => store.olderMessagesStatus() === 'loading'),

    hasMessages: computed(() => store.messages().length > 0),

    canLoadOlder: computed(
      () =>
        store.loadStatus() === 'loaded' &&
        store.nextCursor() !== null &&
        store.olderMessagesStatus() !== 'loading'
    ),
  })),

  withMethods(
    (store, messageApplication = inject(MessageApplicationService)) => {
      const isCurrentRequest = (
        channelId: ChannelId,
        generation: number
      ): boolean =>
        store.channelId() === channelId &&
        store.requestGeneration() === generation;

      const loadInitialPage = async (
        channelId: ChannelId,
        generation: number
      ): Promise<void> => {
        try {
          const page = await messageApplication.listChannelMessages({
            channelId,
            limit: MESSAGE_PAGE_SIZE,
          });

          if (!isCurrentRequest(channelId, generation)) {
            return;
          }

          patchState(store, {
            messages: page.messages,
            nextCursor: page.nextCursor,
            loadStatus: 'loaded',
            olderMessagesStatus: 'idle',
            error: null,
          });
        } catch (error: unknown) {
          if (!isCurrentRequest(channelId, generation)) {
            return;
          }

          patchState(store, {
            loadStatus: 'failed',
            error: toChannelMessagesError(error),
          });
        }
      };

      return {
        /**
         * Selects a channel and loads its latest message page.
         */
        async selectChannel(channelId: ChannelId): Promise<void> {
          if (
            store.channelId() === channelId &&
            store.loadStatus() !== 'failed'
          ) {
            return;
          }

          const generation = store.requestGeneration() + 1;

          patchState(store, {
            channelId,
            messages: [],
            nextCursor: null,
            loadStatus: 'loading',
            olderMessagesStatus: 'idle',
            error: null,
            requestGeneration: generation,
          });

          await loadInitialPage(channelId, generation);
        },

        /**
         * Reloads the currently selected channel.
         */
        async refresh(): Promise<void> {
          const channelId = store.channelId();

          if (channelId === null) {
            return;
          }

          const generation = store.requestGeneration() + 1;

          patchState(store, {
            loadStatus: 'loading',
            olderMessagesStatus: 'idle',
            error: null,
            requestGeneration: generation,
          });

          await loadInitialPage(channelId, generation);
        },

        /**
         * Loads the next page of older messages.
         */
        async loadOlder(): Promise<void> {
          const channelId = store.channelId();

          const before = store.nextCursor();

          if (
            channelId === null ||
            before === null ||
            store.loadStatus() !== 'loaded' ||
            store.olderMessagesStatus() === 'loading'
          ) {
            return;
          }

          const generation = store.requestGeneration();

          patchState(store, {
            olderMessagesStatus: 'loading',
            error: null,
          });

          try {
            const page = await messageApplication.listChannelMessages({
              channelId,
              limit: MESSAGE_PAGE_SIZE,
              before,
            });

            if (!isCurrentRequest(channelId, generation)) {
              return;
            }

            patchState(store, {
              messages: appendUniqueMessages(store.messages(), page.messages),
              nextCursor: page.nextCursor,
              olderMessagesStatus: 'idle',
            });
          } catch (error: unknown) {
            if (!isCurrentRequest(channelId, generation)) {
              return;
            }

            patchState(store, {
              olderMessagesStatus: 'failed',
              error: toChannelMessagesError(error),
            });
          }
        },

        /**
         * Clears the selected channel and invalidates outstanding requests.
         */
        clear(): void {
          const nextGeneration = store.requestGeneration() + 1;

          patchState(store, {
            ...initialChannelMessagesState,
            requestGeneration: nextGeneration,
          });
        },

        clearError(): void {
          patchState(store, {
            error: null,
          });
        },
      };
    }
  )
);
