import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { ProfileApplicationService } from '@client/core/profile/profile-application.service';
import { initialCurrentProfileState } from './current-profile.state';

/**
 * Owns read-only current-profile loading for one authenticated shell.
 *
 * Authentication remains owned by `AuthenticationStore`; this store receives
 * the session user identifier and holds only the corresponding display data.
 */
export const CurrentProfileStore = signalStore(
  withState(initialCurrentProfileState),

  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
  })),

  withMethods(
    (store, profileApplication = inject(ProfileApplicationService)) => {
      let requestVersion = 0;
      let activeRequest: {
        readonly userId: string;
        readonly promise: Promise<void>;
      } | null = null;

      return {
        /**
         * Loads a profile once for the current session identity.
         *
         * Duplicate calls share the active request. A changed session identity
         * clears the previous profile, and its late response cannot overwrite
         * the newer user's state.
         */
        load(userId: string): Promise<void> {
          if (store.userId() === userId && store.loadStatus() === 'loaded') {
            return Promise.resolve();
          }

          if (activeRequest?.userId === userId) {
            return activeRequest.promise;
          }

          const version = ++requestVersion;

          patchState(store, {
            userId,
            profile: null,
            loadStatus: 'loading',
            error: null,
          });

          const promise = profileApplication
            .getCurrentProfile(userId)
            .then((result) => {
              if (version !== requestVersion) {
                return;
              }

              Either.match(result, {
                onLeft: () => {
                  patchState(store, {
                    profile: null,
                    loadStatus: 'failed',
                    error: {
                      message:
                        'Profile details are currently unavailable. Please try again.',
                    },
                  });
                },
                onRight: (profile) => {
                  patchState(store, {
                    profile,
                    loadStatus: 'loaded',
                    error: null,
                  });
                },
              });
            })
            .finally(() => {
              if (version === requestVersion) {
                activeRequest = null;
              }
            });

          activeRequest = { userId, promise };
          return promise;
        },
      };
    }
  )
);
