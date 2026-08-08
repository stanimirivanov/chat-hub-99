import { Context, type Stream } from 'effect';
import type { ProfileId } from '@omoikane/domain/profile';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import type { WorkspacePresenceUnavailableError } from './workspace-presence-error';

/**
 * Outbound port for ephemeral, workspace-scoped online presence.
 *
 * Presence is advisory collaboration state. It must never be used to grant
 * access or authorize a command; persistent membership and RLS remain the
 * authority for those decisions.
 */
export interface WorkspacePresenceService {
  /**
   * Tracks the authenticated profile and observes the distinct profile
   * identities currently connected to one accessible workspace.
   *
   * Every subscription owns one provider channel. Interrupting the stream
   * must stop local tracking and release that channel.
   */
  readonly observe: (
    workspaceId: WorkspaceId
  ) => Stream.Stream<readonly ProfileId[], WorkspacePresenceUnavailableError>;
}

/** Typed Effect service key for workspace presence. */
export const WorkspacePresenceServiceTag =
  Context.GenericTag<WorkspacePresenceService>(
    '@omoikane/application/workspace/WorkspacePresenceService'
  );
