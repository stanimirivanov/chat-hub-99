import { inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStoreFeature,
  type,
  withMethods,
} from '@ngrx/signals';
import type { ChannelId } from '@omoikane/domain/channel';
import type { Message } from '@omoikane/domain/message';
import type { Profile, ProfileId } from '@omoikane/domain/profile';
import { ProfileApplicationService } from '@client/core/profile/profile-application.service';
import type { ChannelMessagesState } from '../channel-messages.state';

export type ChannelMessageAuthorMethods = {
  /**
   * Best-effort enrichment for authors in newly received messages.
   */
  readonly enrichAuthors: (
    messages: readonly Message[],
    channelId: ChannelId,
    generation: number
  ) => Promise<void>;
};

/**
 * Adds feature-local author-profile enrichment shared by page loading and
 * realtime message delivery.
 */
export const withChannelMessageAuthors = () =>
  signalStoreFeature(
    {
      state: type<ChannelMessagesState>(),
    },

    withMethods(
      (store, profileApplication = inject(ProfileApplicationService)) => ({
        async enrichAuthors(
          messages: readonly Message[],
          channelId: ChannelId,
          generation: number
        ): Promise<void> {
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
            store.channelId() !== channelId ||
            store.requestGeneration() !== generation ||
            Either.isLeft(result)
          ) {
            return;
          }

          const profilesById = new Map<ProfileId, Profile>(
            store.authorProfiles().map((profile) => [profile.id, profile])
          );

          for (const profile of result.right) {
            profilesById.set(profile.id, profile);
          }

          patchState(store, {
            authorProfiles: [...profilesById.values()],
          });
        },
      })
    )
  );
