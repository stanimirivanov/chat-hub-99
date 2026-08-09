import { Effect } from 'effect';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import {
  MessageRepositoryTag,
  type ChannelUnreadCount,
  type MessageRepository,
  type MessageRepositoryError,
} from '../repository';

/**
 * Lists the authenticated member's unread-count snapshot for one workspace.
 *
 * The repository owns count semantics because they must remain aligned with
 * the persisted message ordering and read-position query.
 */
export const listWorkspaceChannelUnreadCounts = (
  workspaceId: WorkspaceId
): Effect.Effect<
  readonly ChannelUnreadCount[],
  MessageRepositoryError,
  MessageRepository
> =>
  Effect.gen(function* () {
    const repository = yield* MessageRepositoryTag;
    return yield* repository.listUnreadByWorkspace(workspaceId);
  });
