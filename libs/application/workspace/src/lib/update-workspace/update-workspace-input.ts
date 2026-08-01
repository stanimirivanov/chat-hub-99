/**
 * Raw values accepted from the workspace-update boundary.
 */
export interface UpdateWorkspaceInput {
  readonly workspaceId: string;
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
}
