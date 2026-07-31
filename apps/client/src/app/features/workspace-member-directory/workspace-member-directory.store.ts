import { computed, inject } from '@angular/core';
import { Either } from 'effect';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { Profile } from '@chat-hub/domain/profile';
import type { WorkspaceId, WorkspaceMember } from '@chat-hub/domain/workspace';
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
