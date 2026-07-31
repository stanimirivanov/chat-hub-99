/**
 * Raw values accepted from the workspace-creation boundary.
 */
export interface CreateWorkspaceInput {
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
}
