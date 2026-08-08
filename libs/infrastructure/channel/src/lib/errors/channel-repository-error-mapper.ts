import {
  ChannelArchiveNotAllowedError,
  ChannelCreationNotAllowedError,
  ChannelRepositoryUnavailableError,
  ChannelRestoreNotAllowedError,
  ChannelSlugUnavailableError,
  ChannelUpdateNotAllowedError,
  type ChannelRepositoryCreateError,
  type ChannelRepositoryArchiveError,
  type ChannelRepositoryUpdateError,
  type ChannelRepositoryRestoreError,
  type CreateChannelCommand,
  type UpdateChannelCommand,
} from '@omoikane/application/channel';
import type { ChannelId } from '@omoikane/domain/channel';

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

/**
 * Translates stable owner-authorization and active-lifecycle archive failures.
 */
export const mapChannelArchiveError = (
  channelId: ChannelId,
  error: PostgrestErrorLike
): ChannelRepositoryArchiveError => {
  const message = error.message.toLowerCase();
  const lifecycleRejected =
    error.code === '55000' &&
    (message.includes('does not exist or is already archived') ||
      (message.includes('workspace') && message.includes('is archived')));

  if (error.code === '42501' || lifecycleRejected) {
    return new ChannelArchiveNotAllowedError({ channelId });
  }

  return mapChannelRepositoryError(error);
};

/** Translates stable owner-authorization and archived-lifecycle restoration failures. */
export const mapChannelRestoreError = (
  channelId: ChannelId,
  error: PostgrestErrorLike
): ChannelRepositoryRestoreError => {
  const message = error.message.toLowerCase();
  const lifecycleRejected =
    error.code === '55000' &&
    (message.includes('does not exist or is not archived') ||
      (message.includes('workspace') && message.includes('is archived')));

  if (error.code === '42501' || lifecycleRejected) {
    return new ChannelRestoreNotAllowedError({ channelId });
  }

  return mapChannelRepositoryError(error);
};

/**
 * Translates stable owner-authorization and active-lifecycle update failures.
 */
export const mapChannelUpdateError = (
  command: UpdateChannelCommand,
  error: PostgrestErrorLike
): ChannelRepositoryUpdateError => {
  const message = error.message.toLowerCase();
  const lifecycleRejected =
    error.code === '55000' &&
    (message.includes('does not exist or is archived') ||
      (message.includes('workspace') && message.includes('is archived')));

  if (error.code === '42501' || lifecycleRejected) {
    return new ChannelUpdateNotAllowedError({
      channelId: command.channelId,
    });
  }

  return mapChannelRepositoryError(error);
};
