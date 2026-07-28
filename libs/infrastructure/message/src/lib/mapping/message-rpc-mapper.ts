import type {
  CreateMessageArgs,
  DeleteMessageArgs,
  EditMessageArgs,
} from '@chat-hub/shared/database';
import type {
  CreateMessageCommand,
  DeleteMessageCommand,
  EditMessageCommand,
} from '@chat-hub/application/message';

/**
 * Maps a domain create-message command to the arguments expected by the
 * `create_message` PostgreSQL function.
 */
export const toCreateMessageArgs = (
  command: CreateMessageCommand
): CreateMessageArgs => ({
  p_channel_id: command.channelId,
  p_content: command.content,
});

/**
 * Maps a domain edit-message command to the arguments expected by the
 * `edit_message` PostgreSQL function.
 */
export const toEditMessageArgs = (
  command: EditMessageCommand
): EditMessageArgs => ({
  p_message_id: command.messageId,
  p_content: command.content,
});

/**
 * Maps a domain delete-message command to the arguments expected by the
 * `delete_message` PostgreSQL function.
 */
export const toDeleteMessageArgs = (
  command: DeleteMessageCommand
): DeleteMessageArgs => ({
  p_message_id: command.messageId,
});
