import type { WorkspaceRepository } from '@chat-hub/application/workspace';
import {
  addWorkspaceMember,
  acceptWorkspaceInvitation,
  archiveWorkspace,
  changeWorkspaceMemberRole,
  createWorkspace,
  declineWorkspaceInvitation,
  inviteWorkspaceMember,
  leaveWorkspace,
  removeWorkspaceMember,
  suspendWorkspaceMember,
  updateWorkspace,
} from './commands';
import {
  listAccessibleWorkspaces,
  listPendingWorkspaceInvitations,
  listWorkspaceMembers,
} from './queries';
import type { SupabaseWorkspaceClient } from './supabase-workspace-client';

export const makeSupabaseWorkspaceRepository = (
  client: SupabaseWorkspaceClient
): WorkspaceRepository => ({
  archive: (workspaceId) => archiveWorkspace(client, workspaceId),
  addMember: (command) => addWorkspaceMember(client, command),
  acceptInvitation: (invitationId) =>
    acceptWorkspaceInvitation(client, invitationId),
  listAccessible: () => listAccessibleWorkspaces(client),
  listActiveMembers: (workspaceId) => listWorkspaceMembers(client, workspaceId),
  leave: (workspaceId) => leaveWorkspace(client, workspaceId),
  create: (command) => createWorkspace(client, command),
  declineInvitation: (invitationId) =>
    declineWorkspaceInvitation(client, invitationId),
  inviteMember: (command) => inviteWorkspaceMember(client, command),
  listPendingInvitations: () => listPendingWorkspaceInvitations(client),
  changeMemberRole: (command) => changeWorkspaceMemberRole(client, command),
  removeMember: (command) => removeWorkspaceMember(client, command),
  suspendMember: (command) => suspendWorkspaceMember(client, command),
  update: (command) => updateWorkspace(client, command),
});
