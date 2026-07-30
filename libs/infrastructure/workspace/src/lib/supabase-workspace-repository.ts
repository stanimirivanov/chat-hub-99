import type { WorkspaceRepository } from '@chat-hub/application/workspace';
import { listAccessibleWorkspaces } from './queries';
import type { SupabaseWorkspaceClient } from './supabase-workspace-client';

export const makeSupabaseWorkspaceRepository = (
  client: SupabaseWorkspaceClient
): WorkspaceRepository => ({
  listAccessible: () => listAccessibleWorkspaces(client),
});
