export {
  createMessage,
  InvalidMessageContentError,
  type CreateMessageError,
  type CreateMessageInput,
} from './lib/create-message';

export {
  editMessage,
  InvalidEditedMessageContentError,
  type EditMessageError,
  type EditMessageInput,
} from './lib/edit-message';

export {
  deleteMessage,
  type DeleteMessageError,
  type DeleteMessageInput,
} from './lib/delete-message';

export {
  listChannelMessages,
  InvalidMessagePageLimitError,
  type ListChannelMessagesError,
  type ListChannelMessagesInput,
} from './lib/list-channel-messages';

export {
  InvalidChannelMessageObservationInputError,
  observeChannelMessages,
  type MessageChange,
  type ObserveChannelMessagesError,
} from './lib/observe-channel-messages';

export {
  MessagePageSizeSchema,
  type MessageCursor,
  type MessagePage,
  type MessagePageSize,
} from './lib/pagination';

export {
  MessageRepositoryTag,
  MessageNotFoundError,
  MessageAccessDeniedError,
  MessageContentUnchangedError,
  MessageMutationNotAllowedError,
  MessageRepositoryUnavailableError,
  InvalidMessageDataError,
  type ListChannelMessagesQuery,
  type CreateMessageCommand,
  type DeleteMessageCommand,
  type EditMessageCommand,
  type MessageRepository,
  type MessageRepositoryDeleteError,
  type MessageRepositoryEditError,
  type MessageRepositoryError,
  type MessageChangeNotification,
} from './lib/repository';
