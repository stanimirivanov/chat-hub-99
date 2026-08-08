import { Data } from 'effect';
import type { WorkspaceRepositoryRestoreError } from '../repository';

/** Indicates that a workspace identity failed restoration-boundary validation. */
export class InvalidWorkspaceRestoreInputError extends Data.TaggedError(
  'InvalidWorkspaceRestoreInputError'
)<{
  readonly cause: unknown;
}> {}

export type RestoreWorkspaceError =
  | InvalidWorkspaceRestoreInputError
  | WorkspaceRepositoryRestoreError;
