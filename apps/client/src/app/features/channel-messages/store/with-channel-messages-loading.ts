import { inject } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import type { ChannelId } from '@chat-hub/domain/channel';
import { MessageApplicationService } from '@client/core/message/message-application.service';
import { appendUniqueMessages } from './append-unique-messages';
import {
  initialChannelMessagesState,
  type ChannelMessagesState,
} from '../channel-messages.state';
import { toChannelMessagesError } from './to-channel-messages-error';

const MESSAGE_PAGE_SIZE = 50;

/**
 * Adds channel selection, refresh, and message-page loading operations.
 */
export const withChannelMessagesLoading = () =>
  signalStoreFeature(
    {
      state: type<ChannelMessagesState>(),
    },

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
              sendMessageStatus: 'idle',
              editMessageStatus: 'idle',
              deleteMessageStatus: 'idle',
              error: null,
              sendError: null,
              editError: null,
              deleteError: null,
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
              sendMessageStatus: 'idle',
              editMessageStatus: 'idle',
              deleteMessageStatus: 'idle',
              error: null,
              sendError: null,
              editError: null,
              deleteError: null,
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
