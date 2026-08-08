import { Data } from 'effect';
import type { WorkspaceMemberRepositoryReadError } from '../repository';

/** Indicates that a workspace-member page boundary received invalid input. */
export class InvalidWorkspaceMemberListInputError extends Data.TaggedError(
  'InvalidWorkspaceMemberListInputError'
)<{
  readonly cause: unknown;
}> {}

export type ListWorkspaceMembersError =
  | InvalidWorkspaceMemberListInputError
  | WorkspaceMemberRepositoryReadError;
