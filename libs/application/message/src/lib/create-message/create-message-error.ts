import type { MessageRepositoryError } from '../repository/message-repository-error';
import type { InvalidMessageContentError } from './invalid-message-content-error';

/**
 * Errors that can be produced while creating a message.
 */
export type CreateMessageError =
  | InvalidMessageContentError
  | MessageRepositoryError;
