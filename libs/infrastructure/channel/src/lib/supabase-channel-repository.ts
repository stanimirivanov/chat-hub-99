import type { ChannelRepository } from '@chat-hub/application/channel';
import { createChannel, updateChannel } from './commands';
import { listWorkspaceChannels } from './queries';
import type { SupabaseChannelClient } from './supabase-channel-client';

export const makeSupabaseChannelRepository = (
  client: SupabaseChannelClient
): ChannelRepository => ({
  listByWorkspace: (workspaceId) => listWorkspaceChannels(client, workspaceId),
  create: (command) => createChannel(client, command),
  update: (command) => updateChannel(client, command),
});
