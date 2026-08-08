import { Effect, Schema } from 'effect';
import {
  WorkspaceNameSchema,
  WorkspaceSlugSchema,
} from '@omoikane/domain/workspace';

const decodeString = Schema.decodeUnknown(Schema.String);
const decodeWorkspaceName = Schema.decodeUnknown(WorkspaceNameSchema);
const decodeWorkspaceSlug = Schema.decodeUnknown(WorkspaceSlugSchema);

export type WorkspaceDetailsField = 'name' | 'slug' | 'description';

export interface WorkspaceDetails {
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
}

const readInputField = (
  input: unknown,
  field: WorkspaceDetailsField
): unknown =>
  typeof input === 'object' && input !== null
    ? Reflect.get(input, field)
    : undefined;

/**
 * Normalizes and validates the mutable workspace fields shared by creation and
 * update workflows. Each caller supplies its own typed boundary-error factory.
 */
export const decodeWorkspaceDetails = <Failure>(
  input: unknown,
  invalidField: (field: WorkspaceDetailsField, cause: unknown) => Failure
): Effect.Effect<WorkspaceDetails, Failure> =>
  Effect.all({
    name: decodeString(readInputField(input, 'name')).pipe(
      Effect.map((value) => value.trim()),
      Effect.flatMap(decodeWorkspaceName),
      Effect.mapError((cause) => invalidField('name', cause))
    ),
    slug: decodeString(readInputField(input, 'slug')).pipe(
      Effect.map((value) => value.trim().toLowerCase()),
      Effect.flatMap(decodeWorkspaceSlug),
      Effect.mapError((cause) => invalidField('slug', cause))
    ),
    description: decodeString(readInputField(input, 'description') ?? '').pipe(
      Effect.map((value) => value.trim()),
      Effect.map((value) => (value.length === 0 ? null : value)),
      Effect.mapError((cause) => invalidField('description', cause))
    ),
  });
