/**
 * Raw values accepted at the workspace-member suspension boundary.
 */
export interface SuspendWorkspaceMemberInput {
  readonly workspaceId: string;
  readonly profileId: string;
  readonly reason?: string | null;
}
