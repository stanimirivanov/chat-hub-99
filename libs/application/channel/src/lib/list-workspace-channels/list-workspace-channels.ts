import { Effect } from 'effect';
import type { Channel } from '@chat-hub/domain/channel';
import type { WorkspaceId } from '@chat-hub/domain/workspace';
import {
  ChannelRepositoryTag,
  type ChannelRepository,
  type ChannelRepositoryError,
} from '../repository';

/**
 * Lists active channels visible within one selected workspace.
 *
 * The Effect succeeds with the repository's stable display order, fails with
 * technology-independent repository errors, and requires `ChannelRepository`.
 */
export const listWorkspaceChannels = (
  workspaceId: WorkspaceId
): Effect.Effect<
  readonly Channel[],
  ChannelRepositoryError,
  ChannelRepository
> =>
  Effect.gen(function* () {
    const repository = yield* ChannelRepositoryTag;
    return yield* repository.listByWorkspace(workspaceId);
  });
