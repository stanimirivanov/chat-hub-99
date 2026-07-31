/**
 * Raw values accepted at the workspace-member role-change boundary.
 */
export interface ChangeWorkspaceMemberRoleInput {
  readonly workspaceId: string;
  readonly profileId: string;
  readonly role: string;
}
