export type { MessageChangeNotification } from './message-change-notification';
export {
  MessageRepositoryTag,
  type ListChannelMessagesQuery,
  type ListMessageRevisionsQuery,
  type SearchWorkspaceMessagesQuery,
  type MessageSearchChannel,
  type ChannelUnreadCount,
  type WorkspaceMessageSearchResult,
  type MessageRepository,
} from './message-repository';

export type {
  CreateMessageCommand,
  DeleteMessageCommand,
  EditMessageCommand,
  MarkChannelReadCommand,
} from './message-repository-command';

export {
  InvalidMessageDataError,
  MessageAccessDeniedError,
  MessageContentUnchangedError,
  MessageCreationNotAllowedError,
  MessageMutationNotAllowedError,
  MessageNotFoundError,
  MessageRepositoryUnavailableError,
  type MessageRepositoryCreateError,
  type MessageRepositoryDeleteError,
  type MessageRepositoryEditError,
  type MessageRepositoryOperation,
  type MessageRepositoryError,
} from './message-repository-error';
