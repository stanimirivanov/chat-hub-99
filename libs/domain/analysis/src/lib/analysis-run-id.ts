import { Schema } from 'effect';

/** Runtime-validated UUID carrying Analysis Run identity semantics. */
// prettier-ignore
export const AnalysisRunIdSchema = Schema.UUID.pipe(
  Schema.brand('AnalysisRunId')
);

export type AnalysisRunId = typeof AnalysisRunIdSchema.Type;
