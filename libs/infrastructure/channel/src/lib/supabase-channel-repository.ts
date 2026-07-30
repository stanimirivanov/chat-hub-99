import type { ChannelRepository } from '@chat-hub/application/channel';
import { listWorkspaceChannels } from './queries';
import type { SupabaseChannelClient } from './supabase-channel-client';

export const makeSupabaseChannelRepository = (
  client: SupabaseChannelClient
): ChannelRepository => ({
  listByWorkspace: (workspaceId) => listWorkspaceChannels(client, workspaceId),
});
