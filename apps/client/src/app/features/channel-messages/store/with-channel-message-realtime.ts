import { DestroyRef, inject } from '@angular/core';
import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import type {
  MessageChange,
  ObserveChannelMessagesError,
} from '@omoikane/application/message';
import type { ChannelId } from '@omoikane/domain/channel';
import { MessageApplicationService } from '@client/core/message/message-application.service';
import {
  clearedMessageRevisionHistoryState,
  type ChannelMessagesState,
} from '../channel-messages.state';
import type { ChannelMessageAuthorMethods } from './with-channel-message-authors';
import { reconcileMessageChange } from './reconcile-message-change';

export type ChannelMessageRealtimeMethods = {
  readonly startRealtime: (channelId: ChannelId) => void;
  readonly stopRealtime: () => void;
  readonly retryRealtime: () => void;
};

/**
 * Owns one realtime subscription for the currently selected channel.
 */
export const withChannelMessageRealtime = () =>
  signalStoreFeature(
    {
      state: type<ChannelMessagesState>(),
      methods: type<ChannelMessageAuthorMethods>(),
    },

    withMethods(
      (
        store,
        messageApplication = inject(MessageApplicationService),
        destroyRef = inject(DestroyRef)
      ) => {
        let stopObservation: (() => void) | null = null;
        let observationRevision = 0;

        const stopRealtime = (updateState: boolean): void => {
          observationRevision += 1;
          stopObservation?.();
          stopObservation = null;

          if (updateState) {
            patchState(store, {
              realtimeStatus: 'idle',
              realtimeError: null,
            });
          }
        };

        const isCurrentObservation = (
          channelId: ChannelId,
          revision: number
        ): boolean =>
          store.channelId() === channelId && observationRevision === revision;

        const applyChange = (
          channelId: ChannelId,
          revision: number,
          change: MessageChange
        ): void => {
          if (
            !isCurrentObservation(channelId, revision) ||
            change.message.channelId !== channelId
          ) {
            return;
          }

          patchState(store, {
            messages: reconcileMessageChange(store.messages(), change),
            ...(change.kind === 'updated' &&
            store.revisionHistoryMessageId() === change.message.id
              ? clearedMessageRevisionHistoryState(
                  store.revisionRequestGeneration() + 1
                )
              : {}),
          });

          if (change.kind === 'created') {
            void store.enrichAuthors(
              [change.message],
              channelId,
              store.requestGeneration()
            );
          }
        };

        const applyError = (
          channelId: ChannelId,
          revision: number,
          error: ObserveChannelMessagesError
        ): void => {
          if (!isCurrentObservation(channelId, revision)) {
            return;
          }

          stopObservation = null;
          patchState(store, {
            realtimeStatus: 'failed',
            realtimeError: {
              tag: error._tag,
              message:
                'Live message updates are unavailable. Retry to reconnect.',
            },
          });
        };

        const startRealtime = (channelId: ChannelId): void => {
          if (
            store.channelId() !== channelId ||
            store.loadStatus() !== 'loaded'
          ) {
            return;
          }

          if (
            stopObservation !== null &&
            store.realtimeStatus() === 'observing'
          ) {
            return;
          }

          stopRealtime(false);
          const revision = observationRevision;

          patchState(store, {
            realtimeStatus: 'observing',
            realtimeError: null,
          });

          const cleanup = messageApplication.observeChannelMessages(
            channelId,
            (change) => {
              applyChange(channelId, revision, change);
            },
            (error) => {
              applyError(channelId, revision, error);
            }
          );

          if (
            isCurrentObservation(channelId, revision) &&
            store.realtimeStatus() === 'observing'
          ) {
            stopObservation = cleanup;
          } else {
            cleanup();
          }
        };

        destroyRef.onDestroy(() => {
          stopRealtime(false);
        });

        return {
          startRealtime,

          stopRealtime(): void {
            stopRealtime(true);
          },

          retryRealtime(): void {
            const channelId = store.channelId();

            if (channelId !== null) {
              startRealtime(channelId);
            }
          },
        };
      }
    )
  );
