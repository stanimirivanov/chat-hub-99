import { inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import type { MessageId, MessageRevision } from '@chat-hub/domain/message';
import type { ChannelId } from '@chat-hub/domain/channel';
import { MessageApplicationService } from '@client/core/message/message-application.service';
import {
  clearedMessageRevisionHistoryState,
  type ChannelMessagesState,
} from '../channel-messages.state';
import { toMessageRevisionsError } from './to-channel-messages-error';

const MESSAGE_REVISION_PAGE_SIZE = 20;

const appendUniqueRevisions = (
  current: readonly MessageRevision[],
  incoming: readonly MessageRevision[]
): readonly MessageRevision[] => {
  const knownIds = new Set(current.map((revision) => revision.id));
  return [
    ...current,
    ...incoming.filter((revision) => !knownIds.has(revision.id)),
  ];
};

/** Adds on-demand, paginated revision-history loading for one message. */
export const withChannelMessageRevisions = () =>
  signalStoreFeature(
    { state: type<ChannelMessagesState>() },

    withMethods(
      (store, messageApplication = inject(MessageApplicationService)) => {
        const isCurrentRequest = (
          channelId: ChannelId,
          messageId: MessageId,
          channelGeneration: number,
          revisionGeneration: number
        ): boolean =>
          store.channelId() === channelId &&
          store.revisionHistoryMessageId() === messageId &&
          store.requestGeneration() === channelGeneration &&
          store.revisionRequestGeneration() === revisionGeneration;

        return {
          /** Selects a message and loads its newest revision page. */
          async openRevisionHistory(messageId: MessageId): Promise<void> {
            const channelId = store.channelId();

            if (channelId === null) {
              return;
            }

            if (
              store.revisionHistoryMessageId() === messageId &&
              store.messageRevisionsStatus() === 'loading'
            ) {
              return;
            }

            const channelGeneration = store.requestGeneration();
            const revisionGeneration = store.revisionRequestGeneration() + 1;

            patchState(store, {
              revisionHistoryMessageId: messageId,
              messageRevisions: [],
              revisionNextCursor: null,
              messageRevisionsStatus: 'loading',
              olderMessageRevisionsStatus: 'idle',
              messageRevisionsError: null,
              revisionRequestGeneration: revisionGeneration,
            });

            const result = await messageApplication.listMessageRevisions({
              messageId,
              limit: MESSAGE_REVISION_PAGE_SIZE,
            });

            if (
              !isCurrentRequest(
                channelId,
                messageId,
                channelGeneration,
                revisionGeneration
              )
            ) {
              return;
            }

            Either.match(result, {
              onLeft: (error) => {
                patchState(store, {
                  messageRevisionsStatus: 'failed',
                  messageRevisionsError: toMessageRevisionsError(error),
                });
              },
              onRight: (page) => {
                patchState(store, {
                  messageRevisions: page.revisions,
                  revisionNextCursor: page.nextCursor,
                  messageRevisionsStatus: 'loaded',
                  olderMessageRevisionsStatus: 'idle',
                  messageRevisionsError: null,
                });
              },
            });
          },

          /** Loads the next older revision page for the disclosed message. */
          async loadOlderMessageRevisions(): Promise<void> {
            const messageId = store.revisionHistoryMessageId();
            const before = store.revisionNextCursor();
            const channelId = store.channelId();

            if (
              channelId === null ||
              messageId === null ||
              before === null ||
              store.messageRevisionsStatus() !== 'loaded' ||
              store.olderMessageRevisionsStatus() === 'loading'
            ) {
              return;
            }

            const channelGeneration = store.requestGeneration();
            const revisionGeneration = store.revisionRequestGeneration();

            patchState(store, {
              olderMessageRevisionsStatus: 'loading',
              messageRevisionsError: null,
            });

            const result = await messageApplication.listMessageRevisions({
              messageId,
              limit: MESSAGE_REVISION_PAGE_SIZE,
              before,
            });

            if (
              !isCurrentRequest(
                channelId,
                messageId,
                channelGeneration,
                revisionGeneration
              )
            ) {
              return;
            }

            Either.match(result, {
              onLeft: (error) => {
                patchState(store, {
                  olderMessageRevisionsStatus: 'failed',
                  messageRevisionsError: toMessageRevisionsError(error),
                });
              },
              onRight: (page) => {
                patchState(store, {
                  messageRevisions: appendUniqueRevisions(
                    store.messageRevisions(),
                    page.revisions
                  ),
                  revisionNextCursor: page.nextCursor,
                  olderMessageRevisionsStatus: 'idle',
                  messageRevisionsError: null,
                });
              },
            });
          },

          /** Closes the disclosure and invalidates its outstanding requests. */
          closeRevisionHistory(): void {
            patchState(
              store,
              clearedMessageRevisionHistoryState(
                store.revisionRequestGeneration() + 1
              )
            );
          },
        };
      }
    )
  );
