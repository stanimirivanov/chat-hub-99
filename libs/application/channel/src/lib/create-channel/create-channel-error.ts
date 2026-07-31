import { Data } from 'effect';
import type { ChannelRepositoryCreateError } from '../repository';

export type ChannelCreationField =
  | 'workspaceId'
  | 'name'
  | 'slug'
  | 'description';

/**
 * Indicates that one channel-creation field failed boundary validation.
 */
export class InvalidChannelCreationInputError extends Data.TaggedError(
  'InvalidChannelCreationInputError'
)<{
  readonly field: ChannelCreationField;
  readonly cause: unknown;
}> {}

export type CreateChannelError =
  | InvalidChannelCreationInputError
  | ChannelRepositoryCreateError;
