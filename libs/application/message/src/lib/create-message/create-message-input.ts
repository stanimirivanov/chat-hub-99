import type { ChannelId } from '@omoikane/domain/channel';

/**
 * Input accepted by the create-message use case.
 */
export interface CreateMessageInput {
  readonly channelId: ChannelId;
  readonly content: string;
}
