import { ChannelId, MessageContent, MessageId } from '@chat-hub/domain/message';

export interface CreateMessageCommand {
  readonly channelId: ChannelId;
  readonly content: MessageContent;
}

export interface EditMessageCommandSchema {
  readonly messageId: MessageId;
  readonly content: MessageContent;
}

export interface DeleteMessageCommand {
  readonly messageId: MessageId;
}
