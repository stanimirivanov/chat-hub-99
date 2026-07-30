import { Schema } from 'effect';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import { ChannelIdSchema } from './channel-id';

const ChannelNameSchema = Schema.String.pipe(
  Schema.filter((name) => name.trim().length > 0, {
    message: () => 'Channel name must not be blank.',
  })
);

const ChannelSlugSchema = Schema.String.pipe(
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
