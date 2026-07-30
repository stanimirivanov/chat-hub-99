import { ProfileRepositoryUnavailableError } from '@chat-hub/application/profile';

export const mapProfileRepositoryError = (
  cause: unknown
): ProfileRepositoryUnavailableError =>
  new ProfileRepositoryUnavailableError({ cause });
