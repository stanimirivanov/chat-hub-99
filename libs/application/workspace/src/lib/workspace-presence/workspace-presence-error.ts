import { Data } from 'effect';

/** Input field rejected before workspace presence observation begins. */
export type WorkspacePresenceField = 'workspaceId';

/** Expected validation failure for a workspace-presence request. */
export class InvalidWorkspacePresenceInputError extends Data.TaggedError(
  'InvalidWorkspacePresenceInputError'
)<{
  readonly field: WorkspacePresenceField;
}> {}

/** Expected failure while joining or observing workspace presence. */
export class WorkspacePresenceUnavailableError extends Data.TaggedError(
  'WorkspacePresenceUnavailableError'
)<{
  readonly cause: unknown;
}> {}
