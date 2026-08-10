import { Schema } from 'effect';
import { AnalysisRunIdSchema } from '@omoikane/domain/analysis';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';

/** Runtime-validated UUID carrying durable Analysis job identity semantics. */
// prettier-ignore
export const AnalysisJobIdSchema = Schema.UUID.pipe(
  Schema.brand('AnalysisJobId')
);

/** Runtime-validated identity for an Analysis Run outbox event. */
// prettier-ignore
export const AnalysisRunOutboxEventIdSchema = Schema.UUID.pipe(
  Schema.brand('AnalysisRunOutboxEventId')
);

/** Opaque database fencing token; equality is meaningful only to PostgreSQL. */
// prettier-ignore
export const AnalysisRunOutboxClaimTokenSchema = Schema.UUID.pipe(
  Schema.brand('AnalysisRunOutboxClaimToken')
);

export const AnalysisRunOutboxClaimSchema = Schema.Struct({
  eventId: AnalysisRunOutboxEventIdSchema,
  claimToken: AnalysisRunOutboxClaimTokenSchema,
});

export const AnalysisJobSchema = Schema.Struct({
  id: AnalysisJobIdSchema,
  analysisRunId: AnalysisRunIdSchema,
  workspaceId: WorkspaceIdSchema,
  kind: Schema.Literal('analysis.execute'),
  version: Schema.Literal(1),
  availableAt: Schema.DateFromSelf,
});

export type AnalysisJob = typeof AnalysisJobSchema.Type;
export type AnalysisRunOutboxClaim = typeof AnalysisRunOutboxClaimSchema.Type;
