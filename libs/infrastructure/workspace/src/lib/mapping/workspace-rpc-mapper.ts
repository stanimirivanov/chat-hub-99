import type { CreateWorkspaceCommand } from '@chat-hub/application/workspace';
import type { CreateWorkspaceArgs } from '@chat-hub/shared/database';

/**
 * Maps a validated creation command to generated Supabase RPC arguments.
 */
export const toCreateWorkspaceArgs = (
  command: CreateWorkspaceCommand
): CreateWorkspaceArgs => ({
  p_name: command.name,
  p_slug: command.slug,
  ...(command.description === null
    ? {}
    : { p_description: command.description }),
});
