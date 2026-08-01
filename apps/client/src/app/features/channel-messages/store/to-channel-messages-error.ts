import type {
  CreateMessageError,
  DeleteMessageError,
  EditMessageError,
  ListChannelMessagesError,
} from '@chat-hub/application/message';
import type { ChannelMessagesError } from '../channel-messages.state';

type ChannelMessagesApplicationError =
  | CreateMessageError
  | DeleteMessageError
  | EditMessageError
  | ListChannelMessagesError;

/**
 * Converts typed application failures into safe presentation state.
 *
 * Provider causes and diagnostic messages are deliberately not rendered.
 * Exhaustive tag matching makes a newly introduced application failure a
 * compile-time change at this presentation boundary.
 */
export const toChannelMessagesError = (
  error: ChannelMessagesApplicationError
): ChannelMessagesError => {
  switch (error._tag) {
    case 'InvalidMessageContentError':
      return {
        tag: error._tag,
        message: 'The message content is invalid.',
      };

    case 'InvalidEditedMessageContentError':
      return {
        tag: error._tag,
        message: 'The edited message content is invalid.',
      };

    case 'MessageContentUnchangedError':
      return {
        tag: error._tag,
        message: 'Change the message before saving.',
      };

    case 'MessageNotFoundError':
      return {
        tag: error._tag,
        message: 'The message could not be found.',
      };

    case 'MessageAccessDeniedError':
      return {
        tag: error._tag,
        message: 'You do not have permission to perform this message action.',
      };

    case 'InvalidMessagePageLimitError':
    case 'MessageRepositoryUnavailableError':
    case 'InvalidMessageDataError':
      return {
        tag: error._tag,
        message:
          'Channel messages are currently unavailable. Please try again.',
      };
  }
};
