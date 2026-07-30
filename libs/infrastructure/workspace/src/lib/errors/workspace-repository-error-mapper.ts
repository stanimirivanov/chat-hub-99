import { WorkspaceRepositoryUnavailableError } from '@chat-hub/application/workspace';

export const mapWorkspaceRepositoryError = (
  cause: unknown
): WorkspaceRepositoryUnavailableError =>
  new WorkspaceRepositoryUnavailableError({ cause });
