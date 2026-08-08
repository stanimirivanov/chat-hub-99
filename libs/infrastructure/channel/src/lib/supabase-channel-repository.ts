import type { ChannelRepository } from '@chat-hub/application/channel';
import {
  archiveChannel,
  createChannel,
  restoreChannel,
  updateChannel,
} from './commands';
import {
  listArchivedWorkspaceChannels,
  listWorkspaceChannels,
} from './queries';
import { makeWorkspaceChannelChangesStream } from './realtime';
import type { SupabaseChannelClient } from './supabase-channel-client';

export const makeSupabaseChannelRepository = (
  client: SupabaseChannelClient
): ChannelRepository => ({
  changesByWorkspace: (workspaceId) =>
    makeWorkspaceChannelChangesStream(client, workspaceId),
  archive: (channelId) => archiveChannel(client, channelId),
  listByWorkspace: (workspaceId) => listWorkspaceChannels(client, workspaceId),
  listArchivedByWorkspace: (workspaceId) =>
    listArchivedWorkspaceChannels(client, workspaceId),
  restore: (channelId) => restoreChannel(client, channelId),
  create: (command) => createChannel(client, command),
  update: (command) => updateChannel(client, command),
});
