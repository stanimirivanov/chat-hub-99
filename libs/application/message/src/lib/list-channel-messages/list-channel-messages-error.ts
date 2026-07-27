import type { MessageRepositoryError } from '../message-repository-error';
import type { InvalidMessagePageLimitError } from './invalid-message-page-limit-error';

/**
 * Errors that can be produced while listing messages for a channel.
 */
export type ListChannelMessagesError =
  | InvalidMessagePageLimitError
  | MessageRepositoryError;
