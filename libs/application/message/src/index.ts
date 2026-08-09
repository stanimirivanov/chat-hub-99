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
  InvalidMessageRevisionPageLimitError,
  listMessageRevisions,
  type ListMessageRevisionsCursorInput,
  type ListMessageRevisionsError,
  type ListMessageRevisionsInput,
} from './lib/list-message-revisions';

export {
  InvalidChannelMessageObservationInputError,
  observeChannelMessages,
  type MessageChange,
  type ObserveChannelMessagesError,
} from './lib/observe-channel-messages';

export {
  getChannelMessage,
  type GetChannelMessageInput,
} from './lib/get-channel-message';

export {
  InvalidMessageSearchQueryError,
  searchWorkspaceMessages,
  type MessageSearchChannel,
  type SearchWorkspaceMessagesError,
  type SearchWorkspaceMessagesInput,
  type WorkspaceMessageSearchResult,
} from './lib/search-workspace-messages';

export { listWorkspaceChannelUnreadCounts } from './lib/list-workspace-channel-unread-counts';

export {
  InvalidWorkspaceUnreadObservationInputError,
  observeWorkspaceChannelUnreadCounts,
  type ObserveWorkspaceChannelUnreadCountsError,
} from './lib/observe-workspace-channel-unread-counts';

export {
  markChannelRead,
  type MarkChannelReadInput,
} from './lib/mark-channel-read';

export {
  MessagePageSizeSchema,
  MessageRevisionPageSizeSchema,
  type MessageCursor,
  type MessagePage,
  type MessagePageSize,
  type MessageRevisionCursor,
  type MessageRevisionPage,
  type MessageRevisionPageSize,
} from './lib/pagination';

export {
  MessageRepositoryTag,
  MessageNotFoundError,
  MessageAccessDeniedError,
  MessageContentUnchangedError,
  MessageCreationNotAllowedError,
  MessageMutationNotAllowedError,
  MessageRepositoryUnavailableError,
  InvalidMessageDataError,
  type ListChannelMessagesQuery,
  type ChannelUnreadCount,
  type ListMessageRevisionsQuery,
  type SearchWorkspaceMessagesQuery,
  type CreateMessageCommand,
  type DeleteMessageCommand,
  type EditMessageCommand,
  type MarkChannelReadCommand,
  type MessageRepository,
  type MessageRepositoryCreateError,
  type MessageRepositoryDeleteError,
  type MessageRepositoryEditError,
  type MessageRepositoryError,
  type MessageChangeNotification,
} from './lib/repository';
