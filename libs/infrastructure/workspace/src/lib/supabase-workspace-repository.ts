import type { WorkspaceRepository } from '@omoikane/application/workspace';
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
  restoreWorkspace,
  suspendWorkspaceMember,
  updateWorkspace,
} from './commands';
import {
  listAccessibleWorkspaces,
  listArchivedWorkspaces,
  listPendingWorkspaceInvitations,
  listPendingWorkspaceInvitationsForWorkspace,
  listWorkspaceMembers,
} from './queries';
import { makeWorkspaceAccessChangesStream } from './realtime';
import type { SupabaseWorkspaceClient } from './supabase-workspace-client';

export const makeSupabaseWorkspaceRepository = (
  client: SupabaseWorkspaceClient
): WorkspaceRepository => ({
  accessChanges: () => makeWorkspaceAccessChangesStream(client),
  archive: (workspaceId) => archiveWorkspace(client, workspaceId),
  addMember: (command) => addWorkspaceMember(client, command),
  acceptInvitation: (invitationId) =>
    acceptWorkspaceInvitation(client, invitationId),
  cancelInvitation: (invitationId) =>
    cancelWorkspaceInvitation(client, invitationId),
  listAccessible: () => listAccessibleWorkspaces(client),
  listArchived: () => listArchivedWorkspaces(client),
  listActiveMembers: (query) => listWorkspaceMembers(client, query),
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
  restore: (workspaceId) => restoreWorkspace(client, workspaceId),
  suspendMember: (command) => suspendWorkspaceMember(client, command),
  update: (command) => updateWorkspace(client, command),
});
