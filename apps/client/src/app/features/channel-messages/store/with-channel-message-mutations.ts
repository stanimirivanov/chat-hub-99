import { inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import type { ChannelId } from '@omoikane/domain/channel';
import type { MessageId } from '@omoikane/domain/message';
import { MessageApplicationService } from '@client/core/message/message-application.service';
import {
  clearedMessageRevisionHistoryState,
  type ChannelMessagesState,
} from '../channel-messages.state';
import { prependUniqueMessage } from './prepend-unique-message';
import { replaceMessage } from './replace-message';
import { toChannelMessagesError } from './to-channel-messages-error';

/**
 * Adds create, edit, and soft-delete message operations.
 */
export const withChannelMessageMutations = () =>
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

        return {
          /**
           * Creates a message in the selected channel and prepends it to the
           * current page.
           */
          async send(content: string): Promise<boolean> {
            const channelId = store.channelId();

            if (channelId === null || store.sendMessageStatus() === 'sending') {
              return false;
            }

            const generation = store.requestGeneration();

            patchState(store, {
              sendMessageStatus: 'sending',
              sendError: null,
            });

            const result = await messageApplication.createMessage({
              channelId,
              content,
            });

            if (!isCurrentRequest(channelId, generation)) {
              return false;
            }

            return Either.match(result, {
              onLeft: (error) => {
                patchState(store, {
                  sendMessageStatus: 'failed',
                  sendError: toChannelMessagesError(error),
                });

                return false;
              },
              onRight: (message) => {
                patchState(store, {
                  messages: prependUniqueMessage(store.messages(), message),
                  sendMessageStatus: 'idle',
                });

                return true;
              },
            });
          },

          /**
           * Edits a message and replaces its current projection in the page.
           */
          async edit(messageId: MessageId, content: string): Promise<boolean> {
            const channelId = store.channelId();

            if (channelId === null || store.editMessageStatus() === 'editing') {
              return false;
            }

            const generation = store.requestGeneration();

            patchState(store, {
              editMessageStatus: 'editing',
              editError: null,
            });

            const result = await messageApplication.editMessage({
              messageId,
              content,
            });

            if (!isCurrentRequest(channelId, generation)) {
              return false;
            }

            return Either.match(result, {
              onLeft: (error) => {
                patchState(store, {
                  editMessageStatus: 'failed',
                  editError: toChannelMessagesError(error),
                });

                return false;
              },
              onRight: (message) => {
                patchState(store, {
                  messages: replaceMessage(store.messages(), message),
                  editMessageStatus: 'idle',
                  ...(store.revisionHistoryMessageId() === message.id
                    ? clearedMessageRevisionHistoryState(
                        store.revisionRequestGeneration() + 1
                      )
                    : {}),
                });

                return true;
              },
            });
          },

          /**
           * Soft-deletes a message and replaces its current projection in the
           * loaded page.
           */
          async delete(messageId: MessageId): Promise<boolean> {
            const channelId = store.channelId();

            if (
              channelId === null ||
              store.deleteMessageStatus() === 'deleting'
            ) {
              return false;
            }

            const generation = store.requestGeneration();

            patchState(store, {
              deleteMessageStatus: 'deleting',
              deleteError: null,
            });

            const result = await messageApplication.deleteMessage({
              messageId,
            });

            if (!isCurrentRequest(channelId, generation)) {
              return false;
            }

            return Either.match(result, {
              onLeft: (error) => {
                patchState(store, {
                  deleteMessageStatus: 'failed',
                  deleteError: toChannelMessagesError(error),
                });

                return false;
              },
              onRight: (message) => {
                patchState(store, {
                  messages: replaceMessage(store.messages(), message),
                  deleteMessageStatus: 'idle',
                });

                return true;
              },
            });
          },

          clearSendError(): void {
            patchState(store, {
              sendError: null,
              sendMessageStatus: 'idle',
            });
          },

          clearEditError(): void {
            patchState(store, {
              editError: null,
              editMessageStatus: 'idle',
            });
          },

          clearDeleteError(): void {
            patchState(store, {
              deleteError: null,
              deleteMessageStatus: 'idle',
            });
          },
        };
      }
    )
  );
