import {
  WorkspaceRepositoryUnavailableError,
  WorkspaceSlugUnavailableError,
  type CreateWorkspaceCommand,
  type WorkspaceRepositoryCreateError,
} from '@chat-hub/application/workspace';

interface PostgrestErrorLike {
  readonly code: string;
  readonly message: string;
  readonly details?: string;
}

const WORKSPACE_SLUG_UNIQUE_CONSTRAINT = 'workspace_heads_current_slug_unique';

export const mapWorkspaceRepositoryError = (
  cause: unknown
): WorkspaceRepositoryUnavailableError =>
  new WorkspaceRepositoryUnavailableError({ cause });

/**
 * Preserves the actionable current-slug conflict while translating every
 * other provider failure to the stable repository-unavailable vocabulary.
 */
export const mapWorkspaceCreateError = (
  command: CreateWorkspaceCommand,
  error: PostgrestErrorLike
): WorkspaceRepositoryCreateError => {
  const description = `${error.message} ${error.details ?? ''}`;

  if (
    error.code === '23505' &&
    description.includes(WORKSPACE_SLUG_UNIQUE_CONSTRAINT)
  ) {
    return new WorkspaceSlugUnavailableError({
      slug: command.slug,
    });
  }

  return mapWorkspaceRepositoryError(error);
};
