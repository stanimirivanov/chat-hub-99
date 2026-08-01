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
  AddWorkspaceMemberByUsernameError,
  ChangeWorkspaceMemberRoleError,
  RemoveWorkspaceMemberError,
} from '@chat-hub/application/workspace';
import type { Profile, ProfileId } from '@chat-hub/domain/profile';
import type {
  WorkspaceId,
  WorkspaceMember,
  WorkspaceMemberRole,
} from '@chat-hub/domain/workspace';
import { ProfileApplicationService } from '@client/core/profile/profile-application.service';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';
import {
  initialWorkspaceMemberDirectoryState,
  type WorkspaceMemberDirectoryEntry,
} from './workspace-member-directory.state';

/**
 * Owns active-membership loading and best-effort profile enrichment for one
 * selected workspace.
 */
export const WorkspaceMemberDirectoryStore = signalStore(
  withState(initialWorkspaceMemberDirectoryState),

  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
    isMutatingMember: computed(() => store.mutationStatus() === 'pending'),
    isChangingRole: computed(
      () =>
        store.mutationStatus() === 'pending' &&
        store.mutationKind() === 'role-change'
    ),
    isRemovingMember: computed(
      () =>
        store.mutationStatus() === 'pending' &&
        store.mutationKind() === 'removal'
    ),
    isAddingMember: computed(() => store.additionStatus() === 'pending'),
    hasMembers: computed(() => store.members().length > 0),
    entries: computed(() =>
      toDirectoryEntries(store.members(), store.profiles())
    ),
  })),

  withMethods(
    (
      store,
      workspaceApplication = inject(WorkspaceApplicationService),
      profileApplication = inject(ProfileApplicationService)
    ) => {
      let requestVersion = 0;
      let activeRequest: {
        readonly workspaceId: WorkspaceId;
        readonly promise: Promise<void>;
      } | null = null;

      return {
        /**
         * Loads active memberships once per workspace and enriches their
         * stable profile identities in one batch. Profile lookup is
         * best-effort, so a profile failure retains a usable role directory.
         */
        load(workspaceId: WorkspaceId): Promise<void> {
          if (
            store.workspaceId() === workspaceId &&
            store.loadStatus() === 'loaded'
          ) {
            return Promise.resolve();
          }

          if (activeRequest?.workspaceId === workspaceId) {
            return activeRequest.promise;
          }

          const version = ++requestVersion;

          patchState(store, {
            workspaceId,
            members: [],
            profiles: [],
            loadStatus: 'loading',
            error: null,
            mutationStatus: 'idle',
            mutationKind: null,
            mutatingProfileId: null,
            mutationError: null,
            additionStatus: 'idle',
            additionError: null,
          });

          const promise = (async () => {
            const membershipResult =
              await workspaceApplication.listWorkspaceMembers(workspaceId);

            if (version !== requestVersion) {
              return;
            }

            if (Either.isLeft(membershipResult)) {
              patchState(store, {
                members: [],
                profiles: [],
                loadStatus: 'failed',
                error: {
                  message:
                    'Workspace members are currently unavailable. Please try again.',
                },
              });
              return;
            }

            const members = membershipResult.right;
            const profileResult = await profileApplication.listCurrentProfiles(
              members.map((member) => member.profileId)
            );

            if (version !== requestVersion) {
              return;
            }

            patchState(store, {
              members,
              profiles: Either.isRight(profileResult)
                ? profileResult.right
                : [],
              loadStatus: 'loaded',
              error: null,
            });
          })().finally(() => {
            if (version === requestVersion) {
              activeRequest = null;
            }
          });

          activeRequest = { workspaceId, promise };
          return promise;
        },

        /**
         * Adds one active profile by exact username. The application result
         * carries both canonical projections, so the directory can update
         * without a second membership or profile query.
         */
        async addMemberByUsername(username: string): Promise<boolean> {
          const workspaceId = store.workspaceId();

          if (
            workspaceId === null ||
            store.loadStatus() !== 'loaded' ||
            store.additionStatus() === 'pending'
          ) {
            return false;
          }

          const version = requestVersion;
          patchState(store, {
            additionStatus: 'pending',
            additionError: null,
          });

          const result =
            await workspaceApplication.addWorkspaceMemberByUsername({
              workspaceId,
              username,
            });

          if (
            version !== requestVersion ||
            store.workspaceId() !== workspaceId
          ) {
            return false;
          }

          if (Either.isLeft(result)) {
            patchState(store, {
              additionStatus: 'failed',
              additionError: presentMemberAdditionError(result.left),
            });
            return false;
          }

          patchState(store, {
            members: [
              ...store
                .members()
                .filter(
                  (member) => member.profileId !== result.right.member.profileId
                ),
              result.right.member,
            ],
            profiles: [
              ...store
                .profiles()
                .filter((profile) => profile.id !== result.right.profile.id),
              result.right.profile,
            ],
            additionStatus: 'idle',
            additionError: null,
          });
          return true;
        },

        /**
         * Changes one role while keeping mutation state independent from the
         * directory load. The canonical membership returned by the command
         * replaces the local projection only if the workspace is still active.
         */
        async changeMemberRole(
          profileId: ProfileId,
          role: WorkspaceMemberRole
        ): Promise<boolean> {
          const workspaceId = store.workspaceId();

          if (
            workspaceId === null ||
            store.loadStatus() !== 'loaded' ||
            store.mutationStatus() === 'pending'
          ) {
            return false;
          }

          const version = requestVersion;
          patchState(store, {
            mutationStatus: 'pending',
            mutationKind: 'role-change',
            mutatingProfileId: profileId,
            mutationError: null,
          });

          const result = await workspaceApplication.changeWorkspaceMemberRole({
            workspaceId,
            profileId,
            role,
          });

          if (
            version !== requestVersion ||
            store.workspaceId() !== workspaceId
          ) {
            return false;
          }

          if (Either.isLeft(result)) {
            patchState(store, {
              mutationStatus: 'failed',
              mutatingProfileId: null,
              mutationError: presentMemberMutationError(
                result.left,
                'role-change'
              ),
            });
            return false;
          }

          patchState(store, {
            members: store
              .members()
              .map((member) =>
                member.profileId === profileId ? result.right : member
              ),
            mutationStatus: 'idle',
            mutationKind: null,
            mutatingProfileId: null,
            mutationError: null,
          });
          return true;
        },

        /**
         * Removes one member only after the application command confirms the
         * canonical removed state. Profiles are presentation enrichment and
         * are discarded with the removed membership.
         */
        async removeMember(
          profileId: ProfileId,
          reason: string | null = null
        ): Promise<boolean> {
          const workspaceId = store.workspaceId();

          if (
            workspaceId === null ||
            store.loadStatus() !== 'loaded' ||
            store.mutationStatus() === 'pending'
          ) {
            return false;
          }

          const version = requestVersion;
          patchState(store, {
            mutationStatus: 'pending',
            mutationKind: 'removal',
            mutatingProfileId: profileId,
            mutationError: null,
          });

          const result = await workspaceApplication.removeWorkspaceMember({
            workspaceId,
            profileId,
            reason,
          });

          if (
            version !== requestVersion ||
            store.workspaceId() !== workspaceId
          ) {
            return false;
          }

          if (Either.isLeft(result)) {
            patchState(store, {
              mutationStatus: 'failed',
              mutatingProfileId: null,
              mutationError: presentMemberMutationError(result.left, 'removal'),
            });
            return false;
          }

          patchState(store, {
            members: store
              .members()
              .filter((member) => member.profileId !== profileId),
            profiles: store
              .profiles()
              .filter((profile) => profile.id !== profileId),
            mutationStatus: 'idle',
            mutationKind: null,
            mutatingProfileId: null,
            mutationError: null,
          });
          return true;
        },

        clearMemberMutationError(): void {
          if (store.mutationStatus() !== 'pending') {
            patchState(store, {
              mutationStatus: 'idle',
              mutationKind: null,
              mutatingProfileId: null,
              mutationError: null,
            });
          }
        },

        clearMemberAdditionError(): void {
          if (store.additionStatus() !== 'pending') {
            patchState(store, {
              additionStatus: 'idle',
              additionError: null,
            });
          }
        },
      };
    }
  )
);

const toDirectoryEntries = (
  members: readonly WorkspaceMember[],
  profiles: readonly Profile[]
): readonly WorkspaceMemberDirectoryEntry[] => {
  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile] as const)
  );

  return members
    .map((member) => ({
      profileId: member.profileId,
      displayName:
        profilesById.get(member.profileId)?.displayName ?? 'Another member',
      role: member.role,
    }))
    .sort(
      (left, right) =>
        roleOrder(left.role) - roleOrder(right.role) ||
        left.displayName.localeCompare(right.displayName) ||
        left.profileId.localeCompare(right.profileId)
    );
};

const roleOrder = (role: WorkspaceMemberDirectoryEntry['role']): number =>
  role === 'owner' ? 0 : 1;

const presentMemberMutationError = (
  error: ChangeWorkspaceMemberRoleError | RemoveWorkspaceMemberError,
  kind: 'role-change' | 'removal'
): { readonly message: string } => {
  switch (error._tag) {
    case 'WorkspaceLastOwnerDemotionError':
      return {
        message:
          'Assign another owner before changing the last owner to a member.',
      };
    case 'WorkspaceMemberRoleChangeNotAllowedError':
      return {
        message: 'You no longer have permission to change member roles.',
      };
    case 'WorkspaceLastOwnerRemovalError':
      return {
        message: 'The last active workspace owner cannot be removed.',
      };
    case 'WorkspaceMemberRemovalNotAllowedError':
      return {
        message: 'You no longer have permission to remove workspace members.',
      };
    case 'WorkspaceMemberNotFoundError':
    case 'WorkspaceMemberNotActiveError':
      return {
        message: 'This person is no longer an active workspace member.',
      };
    case 'WorkspaceMemberRoleUnchangedError':
      return { message: 'This member already has the requested role.' };
    case 'InvalidWorkspaceMemberRoleChangeInputError':
    case 'InvalidWorkspaceMemberRemovalInputError':
    case 'InvalidWorkspaceMemberDataError':
    case 'WorkspaceRepositoryUnavailableError':
      return {
        message:
          kind === 'role-change'
            ? 'The member role could not be changed. Please try again.'
            : 'The workspace member could not be removed. Please try again.',
      };
  }
};

const presentMemberAdditionError = (
  error: AddWorkspaceMemberByUsernameError
): { readonly message: string } => {
  switch (error._tag) {
    case 'InvalidWorkspaceMemberAdditionInputError':
      return {
        message:
          error.field === 'username'
            ? 'Enter an exact username.'
            : 'The selected workspace is invalid.',
      };
    case 'WorkspaceMemberCandidateNotFoundError':
      return {
        message: 'No active profile was found for that username.',
      };
    case 'WorkspaceMemberAdditionNotAllowedError':
      return {
        message: 'You no longer have permission to add workspace members.',
      };
    case 'WorkspaceMemberProfileNotActiveError':
      return {
        message: 'That profile is no longer active.',
      };
    case 'WorkspaceMembershipHistoryExistsError':
      return {
        message:
          'That user already belongs, or previously belonged, to this workspace and cannot be added again.',
      };
    case 'InvalidProfileDataError':
    case 'ProfileRepositoryUnavailableError':
    case 'InvalidWorkspaceMemberDataError':
    case 'WorkspaceRepositoryUnavailableError':
      return {
        message: 'The workspace member could not be added. Please try again.',
      };
  }
};
