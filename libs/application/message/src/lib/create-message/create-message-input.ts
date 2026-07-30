import type { ChannelId } from '@chat-hub/domain/channel';

/**
 * Input accepted by the create-message use case.
 */
export interface CreateMessageInput {
  readonly channelId: ChannelId;
  readonly content: string;
}
