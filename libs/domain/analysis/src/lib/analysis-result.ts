import { Schema } from 'effect';
import {
  MessageIdSchema,
  MessageRevisionIdSchema,
} from '@omoikane/domain/message';
import { AnalysisRunIdSchema } from './analysis-run-id';

// prettier-ignore
export const AnalysisResultIdSchema = Schema.UUID.pipe(
  Schema.brand('AnalysisResultId')
);

export const AnalysisResultSourceSchema = Schema.Struct({
  messageId: MessageIdSchema,
  messageRevisionId: MessageRevisionIdSchema,
});

export const AnalysisFindingSchema = Schema.Struct({
  kind: Schema.Literal('workspace-message-inventory'),
  status: Schema.Literal('proposed'),
  title: Schema.String.pipe(Schema.nonEmptyString(), Schema.maxLength(120)),
  summary: Schema.String.pipe(Schema.nonEmptyString(), Schema.maxLength(500)),
  confidence: Schema.Number.pipe(Schema.between(0, 1)),
});

/** Immutable output of the bounded deterministic workspace inventory. */
export const AnalysisResultSchema = Schema.Struct({
  id: AnalysisResultIdSchema,
  analysisRunId: AnalysisRunIdSchema,
  kind: Schema.Literal('workspace-message-inventory'),
  processorVersion: Schema.String.pipe(
    Schema.nonEmptyString(),
    Schema.maxLength(128)
  ),
  providerKind: Schema.Literal('deterministic'),
  model: Schema.Null,
  evaluationVersion: Schema.Literal('workspace-message-inventory.v1'),
  sourceCount: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  sourceTruncated: Schema.Boolean,
  sources: Schema.Array(AnalysisResultSourceSchema),
  finding: AnalysisFindingSchema,
  createdAt: Schema.DateFromSelf,
}).pipe(
  Schema.filter((result) => result.sourceCount === result.sources.length, {
    message: () => 'Analysis result source count does not match its sources.',
  })
);

export type AnalysisResultId = typeof AnalysisResultIdSchema.Type;
export type AnalysisResultSource = typeof AnalysisResultSourceSchema.Type;
export type AnalysisFinding = typeof AnalysisFindingSchema.Type;
export type AnalysisResult = typeof AnalysisResultSchema.Type;
