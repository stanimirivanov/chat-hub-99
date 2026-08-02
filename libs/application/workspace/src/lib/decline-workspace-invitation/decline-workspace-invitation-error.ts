import { Data } from 'effect';
import type { WorkspaceInvitationDeclineRepositoryError } from '../repository';

/** Indicates that the invitation identity failed boundary validation. */
export class InvalidWorkspaceInvitationDeclineInputError extends Data.TaggedError(
  'InvalidWorkspaceInvitationDeclineInputError'
)<{
  readonly cause: unknown;
}> {}

export type DeclineWorkspaceInvitationError =
  | InvalidWorkspaceInvitationDeclineInputError
  | WorkspaceInvitationDeclineRepositoryError;
