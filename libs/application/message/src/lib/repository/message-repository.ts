import { Context, type Effect } from 'effect';
import type {
  ChannelId,
  CreateMessageCommand,
  DeleteMessageCommand,
  EditMessageCommand,
  Message,
  MessageId,
} from '@chat-hub/domain/message';

import type { MessageCursor } from '../pagination/message-cursor';
import type { MessagePage } from '../pagination/message-page';
import type { MessagePageSize } from '../pagination/message-page-size';
import type { MessageRepositoryError } from './message-repository-error';

/**
 * Query used by the repository to retrieve one channel-message page.
 */
export interface ListChannelMessagesQuery {
  readonly channelId: ChannelId;
  readonly limit: MessagePageSize;
  readonly before?: MessageCursor;
}

/**
 * Outbound application port for message persistence and retrieval.
 *
 * The interface is expressed entirely in domain and application types. A
 * concrete adapter may use Supabase, an in-memory test implementation, or a
 * different persistence technology without changing message use cases.
 *
 * Implementations must validate external data before returning `Message`
 * values and must translate technology-specific failures into
 * `MessageRepositoryError`.
 */
export interface MessageRepository {
  /** Persists a new message identity and returns its stable identifier. */
  readonly create: (
    command: CreateMessageCommand
  ) => Effect.Effect<MessageId, MessageRepositoryError>;

  /** Appends a new version to an existing active message. */
  readonly edit: (
    command: EditMessageCommand
  ) => Effect.Effect<void, MessageRepositoryError>;

  /** Transitions an active message to the soft-deleted state. */
  readonly delete: (
    command: DeleteMessageCommand
  ) => Effect.Effect<void, MessageRepositoryError>;

  /** Returns the current projection for a stable message identity. */
  readonly findById: (
    messageId: MessageId
  ) => Effect.Effect<Message, MessageRepositoryError>;

  /** Returns one newest-first keyset-paginated channel page. */
  readonly listByChannel: (
    query: ListChannelMessagesQuery
  ) => Effect.Effect<MessagePage, MessageRepositoryError>;
}

/**
 * Effect service identifier used by application use cases to request a
 * `MessageRepository` without depending on its infrastructure implementation.
 */
export const MessageRepositoryTag = Context.GenericTag<MessageRepository>(
  '@chat-hub/application/message/MessageRepository'
);
