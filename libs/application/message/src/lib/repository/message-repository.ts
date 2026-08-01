import { Context, type Effect, type Stream } from 'effect';
import type { ChannelId } from '@chat-hub/domain/channel';
import type { Message, MessageId } from '@chat-hub/domain/message';
import type {
  CreateMessageCommand,
  DeleteMessageCommand,
  EditMessageCommand,
} from './message-repository-command';
import type {
  MessageRepositoryEditError,
  MessageRepositoryError,
} from './message-repository-error';
import type { MessageChangeNotification } from './message-change-notification';
import type {
  MessageCursor,
  MessagePage,
  MessagePageSize,
} from '../pagination';

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

  /**
   * Appends a new version to an existing active message.
   *
   * Implementations compare normalized content with the authoritative current
   * projection and fail with `MessageContentUnchangedError` rather than
   * appending a no-op version.
   */
  readonly edit: (
    command: EditMessageCommand
  ) => Effect.Effect<void, MessageRepositoryEditError>;

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

  /**
   * Observes message-head changes scoped to one RLS-visible channel.
   *
   * Every stream subscription owns one provider listener. Interrupting the
   * stream must release that listener.
   */
  readonly changesByChannel: (
    channelId: ChannelId
  ) => Stream.Stream<MessageChangeNotification, MessageRepositoryError>;
}

/**
 * Effect service identifier used by application use cases to request a
 * `MessageRepository` without depending on its infrastructure implementation.
 */
export const MessageRepositoryTag = Context.GenericTag<MessageRepository>(
  '@chat-hub/application/message/MessageRepository'
);
