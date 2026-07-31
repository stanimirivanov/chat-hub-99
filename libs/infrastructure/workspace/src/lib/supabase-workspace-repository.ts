import type { WorkspaceRepository } from '@chat-hub/application/workspace';
import { createWorkspace } from './commands';
import { listAccessibleWorkspaces } from './queries';
import type { SupabaseWorkspaceClient } from './supabase-workspace-client';

export const makeSupabaseWorkspaceRepository = (
  client: SupabaseWorkspaceClient
): WorkspaceRepository => ({
  listAccessible: () => listAccessibleWorkspaces(client),
  create: (command) => createWorkspace(client, command),
});
