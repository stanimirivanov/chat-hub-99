import type { WorkspaceRepository } from '@chat-hub/application/workspace';
import {
  changeWorkspaceMemberRole,
  createWorkspace,
  removeWorkspaceMember,
} from './commands';
import { listAccessibleWorkspaces, listWorkspaceMembers } from './queries';
import type { SupabaseWorkspaceClient } from './supabase-workspace-client';

export const makeSupabaseWorkspaceRepository = (
  client: SupabaseWorkspaceClient
): WorkspaceRepository => ({
  listAccessible: () => listAccessibleWorkspaces(client),
  listActiveMembers: (workspaceId) => listWorkspaceMembers(client, workspaceId),
  create: (command) => createWorkspace(client, command),
  changeMemberRole: (command) => changeWorkspaceMemberRole(client, command),
  removeMember: (command) => removeWorkspaceMember(client, command),
});
