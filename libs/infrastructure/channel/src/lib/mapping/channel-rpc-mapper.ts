import type {
  CreateChannelCommand,
  UpdateChannelCommand,
} from '@chat-hub/application/channel';
import type {
  CreateChannelArgs,
  UpdateChannelArgs,
} from '@chat-hub/shared/database';

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

/**
 * Maps validated mutable channel details to generated update RPC arguments.
 */
export const toUpdateChannelArgs = (
  command: UpdateChannelCommand
): UpdateChannelArgs => ({
  p_channel_id: command.channelId,
  p_name: command.name,
  ...(command.description === null
    ? {}
    : { p_description: command.description }),
});
