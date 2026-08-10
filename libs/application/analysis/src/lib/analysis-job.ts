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

/** Runtime-validated identity for one auditable Analysis job attempt. */
// prettier-ignore
export const AnalysisJobAttemptIdSchema = Schema.UUID.pipe(
  Schema.brand('AnalysisJobAttemptId')
);

/** Opaque fencing token owned by the current Analysis job lease. */
// prettier-ignore
export const AnalysisJobLeaseTokenSchema = Schema.UUID.pipe(
  Schema.brand('AnalysisJobLeaseToken')
);

export const AnalysisRunOutboxClaimSchema = Schema.Struct({
  eventId: AnalysisRunOutboxEventIdSchema,
  claimToken: AnalysisRunOutboxClaimTokenSchema,
  traceContext: Schema.Struct({
    traceparent: Schema.String,
    tracestate: Schema.NullOr(Schema.String),
  }),
});

export const AnalysisJobSchema = Schema.Struct({
  id: AnalysisJobIdSchema,
  analysisRunId: AnalysisRunIdSchema,
  workspaceId: WorkspaceIdSchema,
  kind: Schema.Literal('analysis.execute'),
  version: Schema.Literal(1),
  availableAt: Schema.DateFromSelf,
});

export const AnalysisJobExecutionSchema = Schema.Struct({
  jobId: AnalysisJobIdSchema,
  attemptId: AnalysisJobAttemptIdSchema,
  analysisRunId: AnalysisRunIdSchema,
  workspaceId: WorkspaceIdSchema,
  kind: Schema.Literal('analysis.execute'),
  version: Schema.Literal(1),
  attemptNumber: Schema.Number.pipe(Schema.int(), Schema.between(1, 5)),
  leaseToken: AnalysisJobLeaseTokenSchema,
  leaseExpiresAt: Schema.DateFromSelf,
  processorVersion: Schema.String.pipe(
    Schema.nonEmptyString(),
    Schema.maxLength(128)
  ),
  traceContext: Schema.Struct({
    traceparent: Schema.String,
    tracestate: Schema.NullOr(Schema.String),
  }),
});

export const AnalysisProcessorReceiptSchema = Schema.Struct({
  processorVersion: Schema.String.pipe(
    Schema.nonEmptyString(),
    Schema.maxLength(128)
  ),
  resultFingerprint: Schema.String.pipe(
    Schema.nonEmptyString(),
    Schema.maxLength(256)
  ),
});

export type AnalysisJob = typeof AnalysisJobSchema.Type;
export type AnalysisRunOutboxClaim = typeof AnalysisRunOutboxClaimSchema.Type;
export type AnalysisJobExecution = typeof AnalysisJobExecutionSchema.Type;
export type AnalysisProcessorReceipt =
  typeof AnalysisProcessorReceiptSchema.Type;
