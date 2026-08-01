/**
 * Raw values accepted at the workspace-member removal boundary.
 */
export interface RemoveWorkspaceMemberInput {
  readonly workspaceId: string;
  readonly profileId: string;
  readonly reason?: string | null;
}
