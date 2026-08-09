import type { WorkspaceId } from '@omoikane/domain/workspace';

/** Browser input accepted by workspace-scoped message search. */
export interface SearchWorkspaceMessagesInput {
  readonly workspaceId: WorkspaceId;
  readonly query: string;
}
