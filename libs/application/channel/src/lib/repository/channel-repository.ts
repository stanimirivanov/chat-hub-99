import { Context, type Effect } from 'effect';
import type { Channel, ChannelId } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import type {
  ChannelRepositoryCreateError,
  ChannelRepositoryReadError,
} from './channel-repository-error';

/**
 * Validated values used to create a channel in one workspace.
 */
export interface CreateChannelCommand {
  readonly workspaceId: WorkspaceId;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
}

/**
 * Outbound port for workspace-scoped channel discovery and creation.
 *
 * Implementations return active channels visible to the current authenticated
 * user, validate external data, and derive the creation actor from the
 * provider-authenticated session.
 */
export interface ChannelRepository {
  /**
   * Returns active RLS-visible channels belonging to one workspace.
   */
  readonly listByWorkspace: (
    workspaceId: WorkspaceId
  ) => Effect.Effect<readonly Channel[], ChannelRepositoryReadError>;

  /**
   * Creates a channel for the provider-authenticated workspace member.
   */
  readonly create: (
    command: CreateChannelCommand
  ) => Effect.Effect<ChannelId, ChannelRepositoryCreateError>;
}

/**
 * Typed Effect service key used to request channel discovery and creation.
 *
 * Application programs request this key without knowing which persistence
 * technology supplies its implementation.
 */
export const ChannelRepositoryTag = Context.GenericTag<ChannelRepository>(
  '@chat-hub/application/channel/ChannelRepository'
);
