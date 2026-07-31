import type { CreateChannelCommand } from '@chat-hub/application/channel';
import type { CreateChannelArgs } from '@chat-hub/shared/database';

/**
 * Maps a validated creation command to generated Supabase RPC arguments.
 */
export const toCreateChannelArgs = (
  command: CreateChannelCommand
): CreateChannelArgs => ({
  p_workspace_id: command.workspaceId,
  p_name: command.name,
  p_slug: command.slug,
  ...(command.description === null
    ? {}
    : { p_description: command.description }),
});
