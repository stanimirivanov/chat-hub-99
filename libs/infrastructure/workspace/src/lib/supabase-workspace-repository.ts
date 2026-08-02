import type { WorkspaceRepository } from '@chat-hub/application/workspace';
import {
  addWorkspaceMember,
  acceptWorkspaceInvitation,
  cancelWorkspaceInvitation,
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
  listPendingWorkspaceInvitationsForWorkspace,
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
  cancelInvitation: (invitationId) =>
    cancelWorkspaceInvitation(client, invitationId),
  listAccessible: () => listAccessibleWorkspaces(client),
  listActiveMembers: (workspaceId) => listWorkspaceMembers(client, workspaceId),
  leave: (workspaceId) => leaveWorkspace(client, workspaceId),
  create: (command) => createWorkspace(client, command),
  declineInvitation: (invitationId) =>
    declineWorkspaceInvitation(client, invitationId),
  inviteMember: (command) => inviteWorkspaceMember(client, command),
  listPendingInvitations: () => listPendingWorkspaceInvitations(client),
  listPendingInvitationsForWorkspace: (workspaceId) =>
    listPendingWorkspaceInvitationsForWorkspace(client, workspaceId),
  changeMemberRole: (command) => changeWorkspaceMemberRole(client, command),
  removeMember: (command) => removeWorkspaceMember(client, command),
  suspendMember: (command) => suspendWorkspaceMember(client, command),
  update: (command) => updateWorkspace(client, command),
});
