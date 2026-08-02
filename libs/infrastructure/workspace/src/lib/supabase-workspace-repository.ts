import type { WorkspaceRepository } from '@chat-hub/application/workspace';
import {
  addWorkspaceMember,
  archiveWorkspace,
  changeWorkspaceMemberRole,
  createWorkspace,
  leaveWorkspace,
  removeWorkspaceMember,
  suspendWorkspaceMember,
  updateWorkspace,
} from './commands';
import { listAccessibleWorkspaces, listWorkspaceMembers } from './queries';
import type { SupabaseWorkspaceClient } from './supabase-workspace-client';

export const makeSupabaseWorkspaceRepository = (
  client: SupabaseWorkspaceClient
): WorkspaceRepository => ({
  archive: (workspaceId) => archiveWorkspace(client, workspaceId),
  addMember: (command) => addWorkspaceMember(client, command),
  listAccessible: () => listAccessibleWorkspaces(client),
  listActiveMembers: (workspaceId) => listWorkspaceMembers(client, workspaceId),
  leave: (workspaceId) => leaveWorkspace(client, workspaceId),
  create: (command) => createWorkspace(client, command),
  changeMemberRole: (command) => changeWorkspaceMemberRole(client, command),
  removeMember: (command) => removeWorkspaceMember(client, command),
  suspendMember: (command) => suspendWorkspaceMember(client, command),
  update: (command) => updateWorkspace(client, command),
});
