import { inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import type { ChannelId } from '@omoikane/domain/channel';
import { MessageApplicationService } from '@client/core/message/message-application.service';
import { appendUniqueMessages } from './append-unique-messages';
import {
  clearedMessageRevisionHistoryState,
  initialChannelMessagesState,
  type ChannelMessagesState,
} from '../channel-messages.state';
import { toChannelMessagesError } from './to-channel-messages-error';
import type { ChannelMessageAuthorMethods } from './with-channel-message-authors';
import type { ChannelMessageRealtimeMethods } from './with-channel-message-realtime';

const MESSAGE_PAGE_SIZE = 50;

/**
 * Adds channel selection, refresh, and message-page loading operations.
 */
export const withChannelMessagesLoading = () =>
  signalStoreFeature(
    {
      state: type<ChannelMessagesState>(),
      methods: type<
        ChannelMessageAuthorMethods & ChannelMessageRealtimeMethods
      >(),
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
          const result = await messageApplication.listChannelMessages({
            channelId,
            limit: MESSAGE_PAGE_SIZE,
          });

          if (!isCurrentRequest(channelId, generation)) {
            return;
          }

          Either.match(result, {
            onLeft: (error) => {
              patchState(store, {
                loadStatus: 'failed',
                error: toChannelMessagesError(error),
              });
            },
            onRight: (page) => {
              patchState(store, {
                messages: page.messages,
                nextCursor: page.nextCursor,
                loadStatus: 'loaded',
                olderMessagesStatus: 'idle',
                error: null,
              });
            },
          });

          if (Either.isRight(result)) {
            store.startRealtime(channelId);

            await store.enrichAuthors(
              result.right.messages,
              channelId,
              generation
            );
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

            store.stopRealtime();

            patchState(store, {
              channelId,
              messages: [],
              authorProfiles: [],
              nextCursor: null,
              loadStatus: 'loading',
              olderMessagesStatus: 'idle',
              sendMessageStatus: 'idle',
              editMessageStatus: 'idle',
              deleteMessageStatus: 'idle',
              realtimeStatus: 'idle',
              error: null,
              sendError: null,
              editError: null,
              deleteError: null,
              realtimeError: null,
              ...clearedMessageRevisionHistoryState(
                store.revisionRequestGeneration() + 1
              ),
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

            store.stopRealtime();

            patchState(store, {
              authorProfiles: [],
              loadStatus: 'loading',
              olderMessagesStatus: 'idle',
              sendMessageStatus: 'idle',
              editMessageStatus: 'idle',
              deleteMessageStatus: 'idle',
              realtimeStatus: 'idle',
              error: null,
              sendError: null,
              editError: null,
              deleteError: null,
              realtimeError: null,
              ...clearedMessageRevisionHistoryState(
                store.revisionRequestGeneration() + 1
              ),
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

            const result = await messageApplication.listChannelMessages({
              channelId,
              limit: MESSAGE_PAGE_SIZE,
              before,
            });

            if (!isCurrentRequest(channelId, generation)) {
              return;
            }

            Either.match(result, {
              onLeft: (error) => {
                patchState(store, {
                  olderMessagesStatus: 'failed',
                  error: toChannelMessagesError(error),
                });
              },
              onRight: (page) => {
                patchState(store, {
                  messages: appendUniqueMessages(
                    store.messages(),
                    page.messages
                  ),
                  nextCursor: page.nextCursor,
                  olderMessagesStatus: 'idle',
                });
              },
            });

            if (Either.isRight(result)) {
              await store.enrichAuthors(
                result.right.messages,
                channelId,
                generation
              );
            }
          },

          /**
           * Clears the selected channel and invalidates outstanding requests.
           */
          clear(): void {
            const nextGeneration = store.requestGeneration() + 1;

            store.stopRealtime();

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
