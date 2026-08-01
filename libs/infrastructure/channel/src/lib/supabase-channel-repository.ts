import type { ChannelRepository } from '@chat-hub/application/channel';
import { archiveChannel, createChannel, updateChannel } from './commands';
import { listWorkspaceChannels } from './queries';
import type { SupabaseChannelClient } from './supabase-channel-client';

export const makeSupabaseChannelRepository = (
  client: SupabaseChannelClient
): ChannelRepository => ({
  archive: (channelId) => archiveChannel(client, channelId),
  listByWorkspace: (workspaceId) => listWorkspaceChannels(client, workspaceId),
  create: (command) => createChannel(client, command),
  update: (command) => updateChannel(client, command),
});
