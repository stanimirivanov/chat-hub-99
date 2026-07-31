import type { Profile, ProfileId } from '@chat-hub/domain/profile';
import type {
  WorkspaceId,
  WorkspaceMember,
  WorkspaceMemberRole,
} from '@chat-hub/domain/workspace';

export type WorkspaceMemberLoadStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'failed';

export type WorkspaceMemberRoleChangeStatus = 'idle' | 'changing' | 'failed';

export interface WorkspaceMemberDirectoryError {
  readonly message: string;
}

/**
 * Display entry derived from a membership and optional profile enrichment.
 */
export interface WorkspaceMemberDirectoryEntry {
  readonly profileId: ProfileId;
  readonly displayName: string;
  readonly role: WorkspaceMemberRole;
}

/**
 * Presentation state for the active-member directory of one workspace.
 */
export interface WorkspaceMemberDirectoryState {
  readonly workspaceId: WorkspaceId | null;
  readonly members: readonly WorkspaceMember[];
  readonly profiles: readonly Profile[];
  readonly loadStatus: WorkspaceMemberLoadStatus;
  readonly error: WorkspaceMemberDirectoryError | null;
  readonly roleChangeStatus: WorkspaceMemberRoleChangeStatus;
  readonly changingProfileId: ProfileId | null;
  readonly roleChangeError: WorkspaceMemberDirectoryError | null;
}

export const initialWorkspaceMemberDirectoryState: WorkspaceMemberDirectoryState =
  {
    workspaceId: null,
    members: [],
    profiles: [],
    loadStatus: 'idle',
    error: null,
    roleChangeStatus: 'idle',
    changingProfileId: null,
    roleChangeError: null,
  };
