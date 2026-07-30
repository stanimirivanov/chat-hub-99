import { Context, type Effect } from 'effect';
import type { Channel } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import type { ChannelRepositoryError } from './channel-repository-error';

/**
 * Outbound port for workspace-scoped channel discovery.
 *
 * Implementations return active channels visible to the current authenticated
 * user and validate external rows before returning them.
 */
export interface ChannelRepository {
  /**
   * Returns active RLS-visible channels belonging to one workspace.
   */
  readonly listByWorkspace: (
    workspaceId: WorkspaceId
  ) => Effect.Effect<readonly Channel[], ChannelRepositoryError>;
}

/**
 * Typed Effect service key used to request channel discovery.
 *
 * Application programs request this key without knowing which persistence
 * technology supplies its implementation.
 */
export const ChannelRepositoryTag = Context.GenericTag<ChannelRepository>(
  '@chat-hub/application/channel/ChannelRepository'
);
