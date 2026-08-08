import { Schema } from 'effect';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import { ChannelIdSchema } from './channel-id';

/**
 * Non-blank channel display name accepted by channel projections and commands.
 */
export const ChannelNameSchema = Schema.String.pipe(
  Schema.filter((name) => name.trim().length > 0, {
    message: () => 'Channel name must not be blank.',
  })
);

/**
 * Lowercase kebab-case channel slug scoped to one workspace.
 */
export const ChannelSlugSchema = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
);

/**
 * Active channel projection required by workspace navigation.
 */
export const ChannelSchema = Schema.Struct({
  id: ChannelIdSchema,
  workspaceId: WorkspaceIdSchema,
  name: ChannelNameSchema,
  slug: ChannelSlugSchema,
  description: Schema.NullOr(Schema.String),
});

export type Channel = typeof ChannelSchema.Type;

/** Archived channel projection available to active workspace owners. */
export const ArchivedChannelSchema = Schema.Struct({
  id: ChannelIdSchema,
  workspaceId: WorkspaceIdSchema,
  name: ChannelNameSchema,
  slug: ChannelSlugSchema,
  description: Schema.NullOr(Schema.String),
  archivedAt: Schema.Date,
});

export type ArchivedChannel = typeof ArchivedChannelSchema.Type;
