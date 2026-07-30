import { Schema } from 'effect';

/**
 * Runtime-validated UUID carrying workspace identity semantics.
 */
// prettier-ignore
export const WorkspaceIdSchema = Schema.UUID.pipe(
  Schema.brand('WorkspaceId')
);

export type WorkspaceId = typeof WorkspaceIdSchema.Type;
