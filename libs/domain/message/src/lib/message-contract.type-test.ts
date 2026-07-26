import type {
  ChannelId,
  CreateMessageCommand,
  Message,
  MessageContent,
  MessageId,
} from '../index';

declare const channelId: ChannelId;
declare const messageId: MessageId;
declare const content: MessageContent;
declare const message: Message;

const command: CreateMessageCommand = {
  channelId,
  content,
};

void command;
void messageId;
void message;

// These should fail when uncommented:
//
// const invalidMessageId: MessageId = channelId;
//
// const invalidCommand: CreateMessageCommand = {
//   channelId: messageId,
//   content,
// };
