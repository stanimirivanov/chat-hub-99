import type { WorkspaceMemberCursor } from '@chat-hub/application/workspace';
import type { AvatarUrl, Profile, ProfileId } from '@chat-hub/domain/profile';
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

export type WorkspaceMemberMutationStatus = 'idle' | 'pending' | 'failed';

export type WorkspaceMemberPaginationStatus = 'idle' | 'loading' | 'failed';

export type WorkspaceMemberMutationKind =
  | 'role-change'
  | 'removal'
  | 'suspension';

export interface WorkspaceMemberDirectoryError {
  readonly message: string;
}

/**
 * Display entry derived from a membership and optional profile enrichment.
 */
export interface WorkspaceMemberDirectoryEntry {
  readonly profileId: ProfileId;
  readonly displayName: string;
  readonly avatarUrl: AvatarUrl | null;
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
  readonly nextCursor: WorkspaceMemberCursor | null;
  readonly paginationStatus: WorkspaceMemberPaginationStatus;
  readonly paginationError: WorkspaceMemberDirectoryError | null;
  readonly mutationStatus: WorkspaceMemberMutationStatus;
  readonly mutationKind: WorkspaceMemberMutationKind | null;
  readonly mutatingProfileId: ProfileId | null;
  readonly mutationError: WorkspaceMemberDirectoryError | null;
}

export const initialWorkspaceMemberDirectoryState: WorkspaceMemberDirectoryState =
  {
    workspaceId: null,
    members: [],
    profiles: [],
    loadStatus: 'idle',
    error: null,
    nextCursor: null,
    paginationStatus: 'idle',
    paginationError: null,
    mutationStatus: 'idle',
    mutationKind: null,
    mutatingProfileId: null,
    mutationError: null,
  };
