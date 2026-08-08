import { Effect } from 'effect';
import type { ArchivedChannel } from '@omoikane/domain/channel';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import {
  ChannelRepositoryTag,
  type ChannelRepository,
  type ChannelRepositoryReadError,
} from '../repository';

/** Lists archived channels visible to an active owner of one workspace. */
export const listArchivedWorkspaceChannels = (
  workspaceId: WorkspaceId
): Effect.Effect<
  readonly ArchivedChannel[],
  ChannelRepositoryReadError,
  ChannelRepository
> =>
  Effect.gen(function* () {
    const repository = yield* ChannelRepositoryTag;
    return yield* repository.listArchivedByWorkspace(workspaceId);
  });
