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
import type { ChannelMessagesState } from '../channel-messages.state';
import { toChannelMessagesError } from './to-channel-messages-error';
import type { ChannelMessageAuthorMethods } from './with-channel-message-authors';

/** Adds exact-message loading without changing the contiguous history page. */
export const withFocusedChannelMessage = () =>
  signalStoreFeature(
    {
      state: type<ChannelMessagesState>(),
      methods: type<ChannelMessageAuthorMethods>(),
    },
    withMethods(
      (store, messageApplication = inject(MessageApplicationService)) => ({
        async selectFocusedMessage(
          channelId: ChannelId,
          messageId: MessageId | null
        ): Promise<void> {
          if (messageId === null) {
            if (store.focusedMessageId() === null) {
              return;
            }

            patchState(store, {
              focusedMessageId: null,
              focusedMessage: null,
              focusedMessageStatus: 'idle',
              focusedMessageError: null,
              focusedMessageRequestGeneration:
                store.focusedMessageRequestGeneration() + 1,
            });
            return;
          }

          if (
            store.focusedMessageId() === messageId &&
            store.focusedMessageStatus() !== 'failed'
          ) {
            return;
          }

          const generation = store.focusedMessageRequestGeneration() + 1;
          patchState(store, {
            focusedMessageId: messageId,
            focusedMessage: null,
            focusedMessageStatus: 'loading',
            focusedMessageError: null,
            focusedMessageRequestGeneration: generation,
          });

          const result = await messageApplication.getChannelMessage({
            channelId,
            messageId,
          });

          if (
            store.channelId() !== channelId ||
            store.focusedMessageId() !== messageId ||
            store.focusedMessageRequestGeneration() !== generation
          ) {
            return;
          }

          Either.match(result, {
            onLeft: (error) => {
              patchState(store, {
                focusedMessage: null,
                focusedMessageStatus: 'failed',
                focusedMessageError: toChannelMessagesError(error),
              });
            },
            onRight: (message) => {
              patchState(store, {
                focusedMessage: message,
                focusedMessageStatus: 'loaded',
                focusedMessageError: null,
              });
            },
          });

          if (Either.isRight(result)) {
            await store.enrichAuthors(
              [result.right],
              channelId,
              store.requestGeneration()
            );
          }
        },
      })
    )
  );
