import { Either } from 'effect';
import { computed, DestroyRef, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type {
  AuthenticationError,
  AuthenticationSession,
} from '@chat-hub/application/authentication';
import { AuthenticationApplicationService } from '@client/core/authentication/authentication-application.service';
import { initialAuthenticationState } from './authentication.state';
import { toAuthenticationPresentationError } from './to-authentication-presentation-error';

/**
 * Root-scoped authentication state for the browser application.
 *
 * The store restores the persisted session once, subscribes once to future
 * provider changes, and coordinates sign-in, sign-up, and sign-out state.
 */
export const AuthenticationStore = signalStore(
  {
    providedIn: 'root',
  },

  withState(initialAuthenticationState),

  withComputed((store) => ({
    isInitializing: computed(() => store.status() === 'initializing'),

    isAuthenticated: computed(() => store.status() === 'authenticated'),

    isSigningIn: computed(() => store.signInStatus() === 'pending'),

    isSigningUp: computed(() => store.signUpStatus() === 'pending'),

    requiresEmailConfirmation: computed(
      () => store.signUpStatus() === 'confirmation-required'
    ),

    isSigningOut: computed(() => store.signOutStatus() === 'pending'),
  })),

  withMethods(
    (
      store,
      authenticationApplication = inject(AuthenticationApplicationService),
      destroyRef = inject(DestroyRef)
    ) => {
      let initialization: Promise<void> | null = null;

      let stopObserving: (() => void) | null = null;

      let sessionRevision = 0;

      /**
       * Applies a current authentication session without completing an
       * independently running authentication request.
       */
      const applySession = (session: AuthenticationSession | null): void => {
        if (session === null) {
          patchState(store, {
            status: 'anonymous',
            session: null,
          });

          return;
        }

        patchState(store, {
          status: 'authenticated',
          session,
          error: null,
          signUpStatus:
            store.signUpStatus() === 'pending' ? store.signUpStatus() : 'idle',
        });
      };

      const isAuthenticationCommandPending = (): boolean =>
        store.signInStatus() === 'pending' ||
        store.signUpStatus() === 'pending' ||
        store.signOutStatus() === 'pending';

      /**
       * Applies an authoritative provider notification and invalidates
       * command results that started against an older session.
       */
      const applyObservedSession = (
        session: AuthenticationSession | null
      ): void => {
        sessionRevision += 1;
        applySession(session);
      };

      /**
       * Records a safe presentation error emitted by the session stream.
       */
      const applyObservationError = (error: AuthenticationError): void => {
        patchState(store, {
          error: toAuthenticationPresentationError(error),
        });
      };

      /**
       * Starts the long-lived provider listener once.
       */
      const startObservation = (): void => {
        if (stopObserving !== null) {
          return;
        }

        stopObserving = authenticationApplication.observeSessionChanges(
          applyObservedSession,
          applyObservationError
        );
      };

      /**
       * Interrupt the Effect stream when Angular destroys this store's
       * injection context. This closes the scoped Supabase subscription.
       */
      destroyRef.onDestroy(() => {
        stopObserving?.();
        stopObserving = null;
      });

      return {
        /**
         * Restores the persisted session and starts session observation.
         *
         * Concurrent and repeated calls share one Promise, preventing
         * duplicate restoration calls and duplicate provider listeners.
         */
        initialize(): Promise<void> {
          if (initialization !== null) {
            return initialization;
          }

          initialization = (async () => {
            patchState(store, {
              status: 'initializing',
              error: null,
            });

            const result = await authenticationApplication.restoreSession();

            Either.match(result, {
              onLeft: (error) => {
                patchState(store, {
                  status: 'anonymous',
                  session: null,
                  error: toAuthenticationPresentationError(error),
                });
              },

              onRight: (session) => {
                applySession(session);
              },
            });

            /*
             * Supabase emits INITIAL_SESSION when the listener is
             * registered. That event closes the small interval between
             * explicit restoration and listener registration.
             */
            startObservation();
          })();

          return initialization;
        },

        /**
         * Attempts email/password authentication.
         *
         * Returns `false` while another authentication command is pending,
         * avoiding overlapping provider requests.
         */
        async signIn(email: string, password: string): Promise<boolean> {
          if (isAuthenticationCommandPending()) {
            return false;
          }

          const startedAtRevision = sessionRevision;

          patchState(store, {
            signInStatus: 'pending',
            error: null,
          });

          const result = await authenticationApplication.signIn({
            email,
            password,
          });

          return Either.match(result, {
            onLeft: (error) => {
              if (sessionRevision !== startedAtRevision) {
                patchState(store, {
                  signInStatus: 'idle',
                });

                return false;
              }

              patchState(store, {
                signInStatus: 'failed',
                error: toAuthenticationPresentationError(error),
              });

              return false;
            },

            onRight: (session) => {
              if (sessionRevision === startedAtRevision) {
                applySession(session);
              }

              patchState(store, {
                signInStatus: 'idle',
              });

              return true;
            },
          });
        },

        /**
         * Attempts email/password account registration.
         *
         * Immediate-session results enter the authenticated shell. A
         * confirmation-required result remains anonymous and exposes a stable
         * completion state instead of treating the absent session as failure.
         */
        async signUp(email: string, password: string): Promise<boolean> {
          if (isAuthenticationCommandPending()) {
            return false;
          }

          const startedAtRevision = sessionRevision;

          patchState(store, {
            signUpStatus: 'pending',
            error: null,
          });

          const result = await authenticationApplication.signUp({
            email,
            password,
          });

          return Either.match(result, {
            onLeft: (error) => {
              if (sessionRevision !== startedAtRevision) {
                patchState(store, {
                  signUpStatus: 'idle',
                });

                return false;
              }

              patchState(store, {
                signUpStatus: 'failed',
                error: toAuthenticationPresentationError(error),
              });

              return false;
            },

            onRight: (signUpResult) => {
              if (sessionRevision !== startedAtRevision) {
                patchState(store, {
                  signUpStatus: 'idle',
                });

                return true;
              }

              if (signUpResult.status === 'authenticated') {
                applySession(signUpResult.session);
                patchState(store, {
                  signUpStatus: 'idle',
                });
              } else {
                patchState(store, {
                  signUpStatus: 'confirmation-required',
                  error: null,
                });
              }

              return true;
            },
          });
        },

        /**
         * Attempts to end the current session.
         *
         * Returns `false` while another authentication command is pending.
         */
        async signOut(): Promise<boolean> {
          if (isAuthenticationCommandPending()) {
            return false;
          }

          const startedAtRevision = sessionRevision;

          patchState(store, {
            signOutStatus: 'pending',
            error: null,
          });

          const result = await authenticationApplication.signOut();

          return Either.match(result, {
            onLeft: (error) => {
              if (sessionRevision !== startedAtRevision) {
                patchState(store, {
                  signOutStatus: 'idle',
                });

                return false;
              }

              patchState(store, {
                signOutStatus: 'failed',
                error: toAuthenticationPresentationError(error),
              });

              return false;
            },

            onRight: () => {
              if (sessionRevision === startedAtRevision) {
                applySession(null);
              }

              patchState(store, {
                signOutStatus: 'idle',
              });

              return true;
            },
          });
        },

        /**
         * Clears the current presentation error and returns failed operation
         * statuses to idle.
         */
        clearError(): void {
          patchState(store, {
            error: null,

            signInStatus:
              store.signInStatus() === 'failed' ? 'idle' : store.signInStatus(),

            signUpStatus:
              store.signUpStatus() === 'failed' ? 'idle' : store.signUpStatus(),

            signOutStatus:
              store.signOutStatus() === 'failed'
                ? 'idle'
                : store.signOutStatus(),
          });
        },

        /** Clears a completed confirmation notice so another email can register. */
        resetSignUp(): void {
          if (store.signUpStatus() !== 'pending') {
            patchState(store, {
              signUpStatus: 'idle',
              error: null,
            });
          }
        },
      };
    }
  )
);
