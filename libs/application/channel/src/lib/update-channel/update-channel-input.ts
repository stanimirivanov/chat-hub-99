/**
 * Raw values accepted from the channel-update boundary.
 */
export interface UpdateChannelInput {
  readonly channelId: string;
  readonly name: string;
  readonly description?: string | null;
}

/**
 * Normalized mutable details acknowledged by a successful update.
 */
export interface UpdatedChannelDetails {
  readonly channelId: ChannelId;
  readonly name: string;
  readonly description: string | null;
}
import type { ChannelId } from '@chat-hub/domain/channel';
