import { Data } from 'effect';
import type { WorkspaceInvitationOwnerRepositoryReadError } from '../repository';

/** Indicates that the selected workspace identity is invalid or missing. */
export class InvalidWorkspaceInvitationOwnerListInputError extends Data.TaggedError(
  'InvalidWorkspaceInvitationOwnerListInputError'
)<{
  readonly cause: unknown;
}> {}

export type ListPendingWorkspaceInvitationsForOwnerError =
  | InvalidWorkspaceInvitationOwnerListInputError
  | WorkspaceInvitationOwnerRepositoryReadError;
