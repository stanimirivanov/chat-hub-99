import { inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import type { ChannelId } from '@chat-hub/domain/channel';
import type { Message } from '@chat-hub/domain/message';
import type { Profile, ProfileId } from '@chat-hub/domain/profile';
import { MessageApplicationService } from '@client/core/message/message-application.service';
import { ProfileApplicationService } from '@client/core/profile/profile-application.service';
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
      (
        store,
        messageApplication = inject(MessageApplicationService),
        profileApplication = inject(ProfileApplicationService)
      ) => {
        const isCurrentRequest = (
          channelId: ChannelId,
          generation: number
        ): boolean =>
          store.channelId() === channelId &&
          store.requestGeneration() === generation;

        const mergeAuthorProfiles = (
          current: readonly Profile[],
          additions: readonly Profile[]
        ): readonly Profile[] => {
          const profilesById = new Map(
            current.map((profile) => [profile.id, profile])
          );

          for (const profile of additions) {
            profilesById.set(profile.id, profile);
          }

          return [...profilesById.values()];
        };

        /**
         * Best-effort enrichment for authors in a newly loaded message page.
         *
         * Message history remains usable when profile discovery fails. The
         * request-generation check prevents a late profile response from
         * enriching a different channel.
         */
        const loadAuthorProfiles = async (
          messages: readonly Message[],
          channelId: ChannelId,
          generation: number
        ): Promise<void> => {
          const loadedProfileIds = new Set(
            store.authorProfiles().map((profile) => profile.id)
          );
          const profileIds = [
            ...new Set<ProfileId>(
              messages
                .map((message) => message.authorId)
                .filter((profileId) => !loadedProfileIds.has(profileId))
            ),
          ];

          if (profileIds.length === 0) {
            return;
          }

          const result =
            await profileApplication.listCurrentProfiles(profileIds);

          if (
            !isCurrentRequest(channelId, generation) ||
            Either.isLeft(result)
          ) {
            return;
          }

          patchState(store, {
            authorProfiles: mergeAuthorProfiles(
              store.authorProfiles(),
              result.right
            ),
          });
        };

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
            await loadAuthorProfiles(
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
              authorProfiles: [],
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
              await loadAuthorProfiles(
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
