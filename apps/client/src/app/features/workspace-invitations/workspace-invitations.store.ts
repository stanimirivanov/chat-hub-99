import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type {
  AcceptWorkspaceInvitationError,
  DeclineWorkspaceInvitationError,
  InviteWorkspaceMemberByUsernameError,
  PendingWorkspaceInvitation,
} from '@chat-hub/application/workspace';
import type {
  Workspace,
  WorkspaceId,
  WorkspaceInvitationId,
} from '@chat-hub/domain/workspace';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';
import {
  initialWorkspaceInvitationsState,
  type WorkspaceInvitationResponseKind,
} from './workspace-invitations.state';

/** Owns invitation discovery, creation, and serialized recipient responses. */
export const WorkspaceInvitationsStore = signalStore(
  withState(initialWorkspaceInvitationsState),

  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
    isCreating: computed(() => store.creationStatus() === 'pending'),
    isResponding: computed(() => store.responseStatus() === 'pending'),
    hasInvitations: computed(() => store.invitations().length > 0),
  })),

  withMethods(
    (store, workspaceApplication = inject(WorkspaceApplicationService)) => {
      let loading: Promise<void> | null = null;

      const respondToInvitation = async (
        invitationId: WorkspaceInvitationId,
        kind: WorkspaceInvitationResponseKind,
        execute: () => Promise<
          Either.Either<
            unknown,
            AcceptWorkspaceInvitationError | DeclineWorkspaceInvitationError
          >
        >
      ): Promise<PendingWorkspaceInvitation | null> => {
        if (
          store.loadStatus() !== 'loaded' ||
          store.responseStatus() === 'pending'
        ) {
          return null;
        }

        const invitation = store
          .invitations()
          .find((candidate) => candidate.invitation.id === invitationId);

        if (invitation === undefined) {
          return null;
        }

        patchState(store, {
          responseStatus: 'pending',
          responseKind: kind,
          respondingInvitationId: invitationId,
          responseError: null,
        });

        const result = await execute();

        if (Either.isLeft(result)) {
          const responseNoLongerAvailable =
            result.left._tag === 'WorkspaceInvitationResponseNotAllowedError';

          patchState(store, {
            ...(responseNoLongerAvailable
              ? {
                  invitations: store
                    .invitations()
                    .filter(
                      (candidate) => candidate.invitation.id !== invitationId
                    ),
                }
              : {}),
            responseStatus: 'failed',
            responseKind: kind,
            respondingInvitationId: null,
            responseError: presentResponseError(result.left),
          });
          return null;
        }

        patchState(store, {
          invitations: store
            .invitations()
            .filter((candidate) => candidate.invitation.id !== invitationId),
          responseStatus: 'idle',
          responseKind: null,
          respondingInvitationId: null,
          responseError: null,
        });
        return invitation;
      };

      return {
        /** Loads pending invitations once; failed requests may be retried. */
        load(): Promise<void> {
          if (store.loadStatus() === 'loaded') {
            return Promise.resolve();
          }

          if (loading !== null) {
            return loading;
          }

          patchState(store, { loadStatus: 'loading', error: null });

          loading = workspaceApplication
            .listPendingWorkspaceInvitations()
            .then((result) => {
              if (Either.isLeft(result)) {
                patchState(store, {
                  invitations: [],
                  loadStatus: 'failed',
                  error: {
                    message:
                      'Workspace invitations are currently unavailable. Please try again.',
                  },
                });
                return;
              }

              patchState(store, {
                invitations: result.right,
                loadStatus: 'loaded',
                error: null,
              });
            })
            .finally(() => {
              loading = null;
            });

          return loading;
        },

        /** Creates a pending invitation for an exact active username. */
        async invite(
          workspaceId: WorkspaceId,
          username: string
        ): Promise<boolean> {
          if (store.creationStatus() === 'pending') {
            return false;
          }

          patchState(store, {
            creationStatus: 'pending',
            creationError: null,
          });

          const result =
            await workspaceApplication.inviteWorkspaceMemberByUsername({
              workspaceId,
              username,
            });

          if (Either.isLeft(result)) {
            patchState(store, {
              creationStatus: 'failed',
              creationError: presentCreationError(result.left),
            });
            return false;
          }

          patchState(store, {
            creationStatus: 'succeeded',
            creationError: null,
          });
          return true;
        },

        /** Accepts and removes one pending invitation from local presentation. */
        async accept(
          invitationId: WorkspaceInvitationId
        ): Promise<Workspace | null> {
          const invitation = await respondToInvitation(
            invitationId,
            'accept',
            () =>
              workspaceApplication.acceptWorkspaceInvitation({ invitationId })
          );

          return invitation?.workspace ?? null;
        },

        /** Declines and removes one pending invitation from local presentation. */
        async decline(invitationId: WorkspaceInvitationId): Promise<boolean> {
          return (
            (await respondToInvitation(invitationId, 'decline', () =>
              workspaceApplication.declineWorkspaceInvitation({ invitationId })
            )) !== null
          );
        },

        clearCreationFeedback(): void {
          if (store.creationStatus() !== 'pending') {
            patchState(store, {
              creationStatus: 'idle',
              creationError: null,
            });
          }
        },

        clearResponseError(): void {
          if (store.responseStatus() !== 'pending') {
            patchState(store, {
              responseStatus: 'idle',
              responseKind: null,
              respondingInvitationId: null,
              responseError: null,
            });
          }
        },
      };
    }
  )
);

const presentCreationError = (
  error: InviteWorkspaceMemberByUsernameError
): { readonly message: string } => {
  switch (error._tag) {
    case 'InvalidWorkspaceInvitationCreationInputError':
      return {
        message:
          error.field === 'username'
            ? 'Enter an exact username.'
            : 'The selected workspace is invalid.',
      };
    case 'WorkspaceInvitationCandidateNotFoundError':
      return { message: 'No active profile was found for that username.' };
    case 'WorkspaceInvitationCreationNotAllowedError':
      return { message: 'You no longer have permission to invite members.' };
    case 'WorkspaceInvitationProfileNotActiveError':
      return { message: 'That profile is no longer active.' };
    case 'WorkspaceInvitationMemberAlreadyActiveError':
      return { message: 'That user is already an active workspace member.' };
    case 'WorkspaceInvitationAlreadyPendingError':
      return { message: 'That user already has a pending invitation.' };
    case 'InvalidProfileDataError':
    case 'ProfileRepositoryUnavailableError':
    case 'InvalidWorkspaceInvitationDataError':
    case 'WorkspaceRepositoryUnavailableError':
      return {
        message:
          'The workspace invitation could not be sent. Please try again.',
      };
  }
};

const presentResponseError = (
  error: AcceptWorkspaceInvitationError | DeclineWorkspaceInvitationError
): { readonly message: string } => {
  switch (error._tag) {
    case 'WorkspaceInvitationResponseNotAllowedError':
      return {
        message:
          'This invitation is no longer pending or cannot be answered by this account.',
      };
    case 'InvalidWorkspaceInvitationAcceptanceInputError':
    case 'InvalidWorkspaceInvitationDeclineInputError':
    case 'InvalidWorkspaceInvitationDataError':
    case 'InvalidWorkspaceMemberDataError':
    case 'WorkspaceRepositoryUnavailableError':
      return {
        message:
          'The invitation response could not be saved. Please try again.',
      };
  }
};
