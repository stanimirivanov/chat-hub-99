import { Schema } from 'effect';

// prettier-ignore
export const WorkspaceIdSchema = Schema.UUID.pipe(
  Schema.brand('WorkspaceId')
);

export type WorkspaceId = typeof WorkspaceIdSchema.Type;
