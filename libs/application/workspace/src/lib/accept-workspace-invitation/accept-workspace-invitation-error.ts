import { Data } from 'effect';
import type { WorkspaceInvitationAcceptanceRepositoryError } from '../repository';

/** Indicates that the invitation identity failed boundary validation. */
export class InvalidWorkspaceInvitationAcceptanceInputError extends Data.TaggedError(
  'InvalidWorkspaceInvitationAcceptanceInputError'
)<{
  readonly cause: unknown;
}> {}

export type AcceptWorkspaceInvitationError =
  | InvalidWorkspaceInvitationAcceptanceInputError
  | WorkspaceInvitationAcceptanceRepositoryError;
