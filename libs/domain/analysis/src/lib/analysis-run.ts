import { Schema } from 'effect';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { AnalysisRunIdSchema } from './analysis-run-id';

/**
 * Immutable acceptance record for the first deterministic trusted workflow.
 * Execution lifecycle and model output deliberately remain outside this slice.
 */
export const AnalysisRunSchema = Schema.Struct({
  id: AnalysisRunIdSchema,
  workspaceId: WorkspaceIdSchema,
  requestedBy: ProfileIdSchema,
  status: Schema.Literal('created'),
  createdAt: Schema.DateFromSelf,
});

export type AnalysisRun = typeof AnalysisRunSchema.Type;
