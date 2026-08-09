import type { ChannelId } from '@omoikane/domain/channel';
import type { MessageId } from '@omoikane/domain/message';

/** Exact loaded channel position that the presentation has observed. */
export interface MarkChannelReadInput {
  readonly channelId: ChannelId;
  readonly messageId: MessageId;
}
