import { Schema } from 'effect';
import { WorkspaceIdSchema } from './workspace-id';

export const WorkspaceNameSchema = Schema.String.pipe(
  Schema.filter((name) => name.trim().length > 0, {
    message: () => 'Workspace name must not be blank.',
  })
);

export const WorkspaceSlugSchema = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
);

/**
 * Active workspace projection required by application navigation.
 */
export const WorkspaceSchema = Schema.Struct({
  id: WorkspaceIdSchema,
  name: WorkspaceNameSchema,
  slug: WorkspaceSlugSchema,
  description: Schema.NullOr(Schema.String),
});

export type Workspace = typeof WorkspaceSchema.Type;
