import { Context, type Effect, type Stream } from 'effect';
import type { Channel, ChannelId } from '@omoikane/domain/channel';
import type {
  ActiveMessage,
  Message,
  MessageId,
} from '@omoikane/domain/message';
import type { WorkspaceId } from '@omoikane/domain/workspace';
import type {
  CreateMessageCommand,
  DeleteMessageCommand,
  EditMessageCommand,
} from './message-repository-command';
import type {
  MessageRepositoryCreateError,
  MessageRepositoryDeleteError,
  MessageRepositoryEditError,
  MessageRepositoryError,
} from './message-repository-error';
import type { MessageChangeNotification } from './message-change-notification';
import type {
  MessageCursor,
  MessagePage,
  MessagePageSize,
  MessageRevisionCursor,
  MessageRevisionPage,
  MessageRevisionPageSize,
} from '../pagination';

/**
 * Query used by the repository to retrieve one channel-message page.
 */
export interface ListChannelMessagesQuery {
  readonly channelId: ChannelId;
  readonly limit: MessagePageSize;
  readonly before?: MessageCursor;
}

/** Query used to retrieve one newest-first page of message revisions. */
export interface ListMessageRevisionsQuery {
  readonly messageId: MessageId;
  readonly limit: MessageRevisionPageSize;
  readonly before?: MessageRevisionCursor;
}

/** Normalized workspace search sent to the persistence boundary. */
export interface SearchWorkspaceMessagesQuery {
  readonly workspaceId: WorkspaceId;
  readonly query: string;
}

/** Active-channel identity required to navigate to one search result. */
export type MessageSearchChannel = Pick<Channel, 'id' | 'name' | 'slug'>;

/** One authorized current-message match and its navigation target. */
export interface WorkspaceMessageSearchResult {
  readonly message: ActiveMessage;
  readonly channel: MessageSearchChannel;
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
 * the operation's documented repository failure vocabulary.
 */
export interface MessageRepository {
  /**
   * Persists a new message identity and returns its stable identifier.
   *
   * An archived target fails with `MessageCreationNotAllowedError`.
   */
  readonly create: (
    command: CreateMessageCommand
  ) => Effect.Effect<MessageId, MessageRepositoryCreateError>;

  /**
   * Appends a new version to an existing active message.
   *
   * Implementations compare normalized content with the authoritative current
   * projection and fail with `MessageContentUnchangedError` rather than
   * appending a no-op version. Lifecycle conflicts fail with
   * `MessageMutationNotAllowedError`.
   */
  readonly edit: (
    command: EditMessageCommand
  ) => Effect.Effect<void, MessageRepositoryEditError>;

  /**
   * Transitions an active message to the soft-deleted state.
   *
   * Lifecycle conflicts fail with `MessageMutationNotAllowedError`.
   */
  readonly delete: (
    command: DeleteMessageCommand
  ) => Effect.Effect<void, MessageRepositoryDeleteError>;

  /** Returns the current projection for a stable message identity. */
  readonly findById: (
    messageId: MessageId
  ) => Effect.Effect<Message, MessageRepositoryError>;

  /** Returns one newest-first keyset-paginated channel page. */
  readonly listByChannel: (
    query: ListChannelMessagesQuery
  ) => Effect.Effect<MessagePage, MessageRepositoryError>;

  /** Returns at most 20 relevance-ranked current messages in active channels. */
  readonly searchWorkspace: (
    query: SearchWorkspaceMessagesQuery
  ) => Effect.Effect<
    readonly WorkspaceMessageSearchResult[],
    MessageRepositoryError
  >;

  /** Returns one newest-first page of immutable revisions for a message. */
  readonly listRevisions: (
    query: ListMessageRevisionsQuery
  ) => Effect.Effect<MessageRevisionPage, MessageRepositoryError>;

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
  '@omoikane/application/message/MessageRepository'
);
