import { Data } from 'effect';
import type { ProfileRepositoryReadError } from '@omoikane/application/profile';
import type { WorkspaceInvitationCreationRepositoryError } from '../repository';
import type { WorkspaceMemberCandidateField } from '../workspace-member-candidate/decode-workspace-member-candidate';

export type WorkspaceInvitationCreationField = WorkspaceMemberCandidateField;

/** Indicates that one invitation field failed boundary validation. */
export class InvalidWorkspaceInvitationCreationInputError extends Data.TaggedError(
  'InvalidWorkspaceInvitationCreationInputError'
)<{
  readonly field: WorkspaceInvitationCreationField;
  readonly cause: unknown;
}> {}

/** Indicates that no active RLS-visible profile owns the exact username. */
export class WorkspaceInvitationCandidateNotFoundError extends Data.TaggedError(
  'WorkspaceInvitationCandidateNotFoundError'
)<{
  readonly username: string;
}> {}

export type InviteWorkspaceMemberByUsernameError =
  | InvalidWorkspaceInvitationCreationInputError
  | WorkspaceInvitationCandidateNotFoundError
  | ProfileRepositoryReadError
  | WorkspaceInvitationCreationRepositoryError;
