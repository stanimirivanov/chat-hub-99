import { Data } from 'effect';
import type { WorkspaceInvitationCancellationRepositoryError } from '../repository';

/** Indicates that the invitation identity is invalid or missing. */
export class InvalidWorkspaceInvitationCancellationInputError extends Data.TaggedError(
  'InvalidWorkspaceInvitationCancellationInputError'
)<{
  readonly cause: unknown;
}> {}

export type CancelWorkspaceInvitationError =
  | InvalidWorkspaceInvitationCancellationInputError
  | WorkspaceInvitationCancellationRepositoryError;
