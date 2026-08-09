import type { ChannelId } from '@omoikane/domain/channel';
import type { MessageId } from '@omoikane/domain/message';

/** Stable route identities required to disclose one channel message. */
export interface GetChannelMessageInput {
  readonly channelId: ChannelId;
  readonly messageId: MessageId;
}
