import {
  ProfileRepositoryUnavailableError,
  ProfileUsernameUnavailableError,
  type ProfileRepositoryUpdateError,
  type UpdateCurrentProfileCommand,
} from '@omoikane/application/profile';

interface PostgrestErrorLike {
  readonly code: string;
  readonly message: string;
  readonly details?: string;
}

const USERNAME_UNIQUE_CONSTRAINT = 'profile_heads_current_username_unique';

export const mapProfileRepositoryError = (
  cause: unknown
): ProfileRepositoryUnavailableError =>
  new ProfileRepositoryUnavailableError({ cause });

/**
 * Preserves the one actionable profile-update conflict while translating all
 * other provider failures to the stable repository-unavailable vocabulary.
 */
export const mapProfileUpdateError = (
  command: UpdateCurrentProfileCommand,
  error: PostgrestErrorLike
): ProfileRepositoryUpdateError => {
  const description = `${error.message} ${error.details ?? ''}`;

  if (
    error.code === '23505' &&
    command.username !== null &&
    description.includes(USERNAME_UNIQUE_CONSTRAINT)
  ) {
    return new ProfileUsernameUnavailableError({
      username: command.username,
    });
  }

  return mapProfileRepositoryError(error);
};
