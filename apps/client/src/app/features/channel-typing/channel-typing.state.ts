import type { ProfileId } from '@omoikane/domain/profile';
import type { ChannelId } from '@omoikane/domain/channel';

export type ChannelTypingStatus =
  | 'idle'
  | 'connecting'
  | 'observing'
  | 'failed';

export interface ChannelTypingState {
  readonly channelId: ChannelId | null;
  readonly typingProfileIds: readonly ProfileId[];
  readonly status: ChannelTypingStatus;
  readonly error: { readonly message: string } | null;
}

export const initialChannelTypingState: ChannelTypingState = {
  channelId: null,
  typingProfileIds: [],
  status: 'idle',
  error: null,
};
