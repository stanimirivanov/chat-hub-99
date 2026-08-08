import { Context, type Effect, type Stream } from 'effect';
import type { Channel, ChannelId } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import type {
  ChannelRepositoryArchiveError,
  ChannelRepositoryCreateError,
  ChannelRepositoryReadError,
  ChannelRepositoryUnavailableError,
  ChannelRepositoryUpdateError,
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
 * Validated mutable values used to append a channel version.
 */
export interface UpdateChannelCommand {
  readonly channelId: ChannelId;
  readonly name: string;
  readonly description: string | null;
}

/**
 * Outbound port for workspace-scoped channel discovery and lifecycle commands.
 *
 * Implementations return active channels visible to the current authenticated
 * user, validate external data, and derive command actors from the
 * provider-authenticated session.
 */
export interface ChannelRepository {
  /**
   * Observes channel-head invalidations scoped to one workspace.
   *
   * Every subscription owns one provider listener. Interrupting the stream
   * must release that listener.
   */
  readonly changesByWorkspace: (
    workspaceId: WorkspaceId
  ) => Stream.Stream<void, ChannelRepositoryUnavailableError>;

  /**
   * Archives one active channel using provider-session authorization.
   */
  readonly archive: (
    channelId: ChannelId
  ) => Effect.Effect<void, ChannelRepositoryArchiveError>;

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

  /**
   * Updates one active channel using provider-session authorization.
   *
   * The implementation validates the immutable version identity returned by
   * the provider before acknowledging success.
   */
  readonly update: (
    command: UpdateChannelCommand
  ) => Effect.Effect<void, ChannelRepositoryUpdateError>;
}

/**
 * Typed Effect service key used to request channel persistence capabilities.
 *
 * Application programs request this key without knowing which persistence
 * technology supplies its implementation.
 */
export const ChannelRepositoryTag = Context.GenericTag<ChannelRepository>(
  '@chat-hub/application/channel/ChannelRepository'
);
