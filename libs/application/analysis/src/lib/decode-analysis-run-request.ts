import { Effect, Schema } from 'effect';
import type { AuthenticatedRequestIdentity } from '@omoikane/application/authentication';
import {
  AnalysisRunIdSchema,
  type AnalysisRunId,
} from '@omoikane/domain/analysis';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import {
  WorkspaceIdSchema,
  type WorkspaceId,
} from '@omoikane/domain/workspace';
import { InvalidAnalysisRunInputError } from './analysis-run-error';

interface StartRequest {
  readonly identity: AuthenticatedRequestIdentity;
  readonly workspaceId: WorkspaceId;
}

export const readInputProperty = (input: unknown, key: string): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, key)
    : undefined;

const decodeField = <A, I>(
  schema: Schema.Schema<A, I, never>,
  value: unknown,
  field: 'requestIdentity' | 'workspaceId' | 'analysisRunId'
): Effect.Effect<A, InvalidAnalysisRunInputError> =>
  Schema.decodeUnknown(schema)(value).pipe(
    Effect.mapError(
      (cause) => new InvalidAnalysisRunInputError({ field, cause })
    )
  );

export const decodeStartRequest = (
  input: unknown
): Effect.Effect<StartRequest, InvalidAnalysisRunInputError> =>
  Effect.gen(function* () {
    const userId = yield* decodeField(
      ProfileIdSchema,
      readInputProperty(readInputProperty(input, 'identity'), 'userId'),
      'requestIdentity'
    );
    const workspaceId = yield* decodeField(
      WorkspaceIdSchema,
      readInputProperty(input, 'workspaceId'),
      'workspaceId'
    );

    return { identity: { userId }, workspaceId };
  });

export const decodeAnalysisRunId = (
  input: unknown
): Effect.Effect<AnalysisRunId, InvalidAnalysisRunInputError> =>
  decodeField(AnalysisRunIdSchema, input, 'analysisRunId');
