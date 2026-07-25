import type { PublicSchema } from './database.types';

/**
 * Names of generated public database views.
 */
export type ViewName = keyof PublicSchema['Views'];

/**
 * Row returned by a generated public database view.
 */
export type ViewRow<TName extends ViewName> =
  PublicSchema['Views'][TName]['Row'];

/**
 * Current profile projection.
 */
export type CurrentProfile = ViewRow<'current_profiles'>;

/**
 * Current workspace projection.
 */
export type CurrentWorkspace = ViewRow<'current_workspaces'>;

/**
 * Current workspace membership projection.
 */
export type CurrentWorkspaceMembership =
  ViewRow<'current_workspace_memberships'>;

/**
 * Current channel projection.
 */
export type CurrentChannel = ViewRow<'current_channels'>;

/**
 * Current message projection.
 */
export type CurrentMessage = ViewRow<'current_messages'>;