import type { PendingWorkspaceInvitation } from '@chat-hub/application/workspace';
import type { WorkspaceInvitationId } from '@chat-hub/domain/workspace';

export type WorkspaceInvitationLoadStatus =
  | 'idle'
  | 'loading'
  | 'loaded'
  | 'failed';

export type WorkspaceInvitationCreationStatus =
  | 'idle'
  | 'pending'
  | 'succeeded'
  | 'failed';

export type WorkspaceInvitationResponseStatus = 'idle' | 'pending' | 'failed';

export type WorkspaceInvitationResponseKind = 'accept' | 'decline';

export interface WorkspaceInvitationsError {
  readonly message: string;
}

/** Presentation state for recipient responses and selected-owner creation. */
export interface WorkspaceInvitationsState {
  readonly invitations: readonly PendingWorkspaceInvitation[];
  readonly loadStatus: WorkspaceInvitationLoadStatus;
  readonly error: WorkspaceInvitationsError | null;
  readonly creationStatus: WorkspaceInvitationCreationStatus;
  readonly creationError: WorkspaceInvitationsError | null;
  readonly responseStatus: WorkspaceInvitationResponseStatus;
  readonly responseKind: WorkspaceInvitationResponseKind | null;
  readonly respondingInvitationId: WorkspaceInvitationId | null;
  readonly responseError: WorkspaceInvitationsError | null;
}

export const initialWorkspaceInvitationsState: WorkspaceInvitationsState = {
  invitations: [],
  loadStatus: 'idle',
  error: null,
  creationStatus: 'idle',
  creationError: null,
  responseStatus: 'idle',
  responseKind: null,
  respondingInvitationId: null,
  responseError: null,
};
