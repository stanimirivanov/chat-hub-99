import { ChannelRepositoryUnavailableError } from '@chat-hub/application/channel';

export const mapChannelRepositoryError = (
  cause: unknown
): ChannelRepositoryUnavailableError =>
  new ChannelRepositoryUnavailableError({ cause });
