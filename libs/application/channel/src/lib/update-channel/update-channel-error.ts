import { Data } from 'effect';
import type { ChannelRepositoryUpdateError } from '../repository';

export type ChannelUpdateField = 'channelId' | 'name' | 'description';

/**
 * Indicates that one channel-update field failed boundary validation.
 */
export class InvalidChannelUpdateInputError extends Data.TaggedError(
  'InvalidChannelUpdateInputError'
)<{
  readonly field: ChannelUpdateField;
  readonly cause: unknown;
}> {}

export type UpdateChannelError =
  | InvalidChannelUpdateInputError
  | ChannelRepositoryUpdateError;
