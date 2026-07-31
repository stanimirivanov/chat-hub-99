import {
  ChannelCreationNotAllowedError,
  ChannelRepositoryUnavailableError,
  ChannelSlugUnavailableError,
  type ChannelRepositoryCreateError,
  type CreateChannelCommand,
} from '@chat-hub/application/channel';

interface PostgrestErrorLike {
  readonly code: string;
  readonly message: string;
  readonly details?: string;
}

export const mapChannelRepositoryError = (
  cause: unknown
): ChannelRepositoryUnavailableError =>
  new ChannelRepositoryUnavailableError({ cause });

/**
 * Preserves actionable slug and authorization failures while translating all
 * other provider failures to the stable repository-unavailable vocabulary.
 */
export const mapChannelCreateError = (
  command: CreateChannelCommand,
  error: PostgrestErrorLike
): ChannelRepositoryCreateError => {
  const description = `${error.message} ${error.details ?? ''}`;

  if (
    error.code === '23505' &&
    description.includes('Channel slug') &&
    description.includes('already exists in workspace')
  ) {
    return new ChannelSlugUnavailableError({
      workspaceId: command.workspaceId,
      slug: command.slug,
    });
  }

  if (error.code === '42501') {
    return new ChannelCreationNotAllowedError({
      workspaceId: command.workspaceId,
    });
  }

  return mapChannelRepositoryError(error);
};
