import { inject } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import type { ChannelId, MessageId } from '@chat-hub/domain/message';
import { MessageApplicationService } from '../../../core/message/message-application.service';
import type { ChannelMessagesState } from '../channel-messages.state';
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

            try {
              const message = await messageApplication.createMessage({
                channelId,
                content,
              });

              if (!isCurrentRequest(channelId, generation)) {
                return false;
              }

              patchState(store, {
                messages: prependUniqueMessage(store.messages(), message),
                sendMessageStatus: 'idle',
              });

              return true;
            } catch (error: unknown) {
              if (!isCurrentRequest(channelId, generation)) {
                return false;
              }

              patchState(store, {
                sendMessageStatus: 'failed',
                sendError: toChannelMessagesError(error),
              });

              return false;
            }
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

            try {
              const message = await messageApplication.editMessage({
                messageId,
                content,
              });

              if (!isCurrentRequest(channelId, generation)) {
                return false;
              }

              patchState(store, {
                messages: replaceMessage(store.messages(), message),
                editMessageStatus: 'idle',
              });

              return true;
            } catch (error: unknown) {
              if (!isCurrentRequest(channelId, generation)) {
                return false;
              }

              patchState(store, {
                editMessageStatus: 'failed',
                editError: toChannelMessagesError(error),
              });

              return false;
            }
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

            try {
              const message = await messageApplication.deleteMessage({
                messageId,
              });

              if (!isCurrentRequest(channelId, generation)) {
                return false;
              }

              patchState(store, {
                messages: replaceMessage(store.messages(), message),
                deleteMessageStatus: 'idle',
              });

              return true;
            } catch (error: unknown) {
              if (!isCurrentRequest(channelId, generation)) {
                return false;
              }

              patchState(store, {
                deleteMessageStatus: 'failed',
                deleteError: toChannelMessagesError(error),
              });

              return false;
            }
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
