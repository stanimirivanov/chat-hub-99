import { Data } from 'effect';
import type { ChannelId } from '@omoikane/domain/channel';
import type { WorkspaceId } from '@omoikane/domain/workspace';

/**
 * Indicates that a channel operation could not reach or query its provider.
 */
export class ChannelRepositoryUnavailableError extends Data.TaggedError(
  'ChannelRepositoryUnavailableError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that external channel data violated the domain contract.
 */
export class InvalidChannelDataError extends Data.TaggedError(
  'InvalidChannelDataError'
)<{
  readonly cause: unknown;
}> {}

/**
 * Indicates that another channel in the workspace already owns the slug.
 */
export class ChannelSlugUnavailableError extends Data.TaggedError(
  'ChannelSlugUnavailableError'
)<{
  readonly workspaceId: WorkspaceId;
  readonly slug: string;
}> {}

/**
 * Indicates that the authenticated actor may not create in the workspace.
 */
export class ChannelCreationNotAllowedError extends Data.TaggedError(
  'ChannelCreationNotAllowedError'
)<{
  readonly workspaceId: WorkspaceId;
}> {}

/**
 * Indicates that the current session or channel lifecycle forbids updating.
 */
export class ChannelUpdateNotAllowedError extends Data.TaggedError(
  'ChannelUpdateNotAllowedError'
)<{
  readonly channelId: ChannelId;
}> {}

/**
 * Indicates that the current session or channel lifecycle forbids archiving.
 */
export class ChannelArchiveNotAllowedError extends Data.TaggedError(
  'ChannelArchiveNotAllowedError'
)<{
  readonly channelId: ChannelId;
}> {}

/**
 * Indicates that the current session or channel lifecycle forbids restoration.
 */
export class ChannelRestoreNotAllowedError extends Data.TaggedError(
  'ChannelRestoreNotAllowedError'
)<{
  readonly channelId: ChannelId;
}> {}

export type ChannelRepositoryReadError =
  | ChannelRepositoryUnavailableError
  | InvalidChannelDataError;

export type ChannelRepositoryCreateError =
  | ChannelRepositoryReadError
  | ChannelSlugUnavailableError
  | ChannelCreationNotAllowedError;

export type ChannelRepositoryUpdateError =
  | ChannelRepositoryReadError
  | ChannelUpdateNotAllowedError;

export type ChannelRepositoryArchiveError =
  | ChannelRepositoryUnavailableError
  | ChannelArchiveNotAllowedError;

export type ChannelRepositoryRestoreError =
  | ChannelRepositoryUnavailableError
  | InvalidChannelDataError
  | ChannelRestoreNotAllowedError;
