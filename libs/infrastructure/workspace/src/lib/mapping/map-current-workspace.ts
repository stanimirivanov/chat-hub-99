import { Effect, Schema } from 'effect';
import {
  InvalidWorkspaceDataError,
  type WorkspaceRepositoryError,
} from '@chat-hub/application/workspace';
import { WorkspaceSchema, type Workspace } from '@chat-hub/domain/workspace';

const decodeWorkspace = Schema.decodeUnknown(WorkspaceSchema);

export interface CurrentWorkspaceNavigationRow {
  readonly workspace_id: string | null;
  readonly name: string | null;
  readonly slug: string | null;
  readonly description: string | null;
}

/**
 * Decodes one generated current-workspace row into the domain projection.
 */
export const mapCurrentWorkspace = (
  row: CurrentWorkspaceNavigationRow
): Effect.Effect<Workspace, WorkspaceRepositoryError> =>
  decodeWorkspace({
    id: row.workspace_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
  }).pipe(
    Effect.mapError(
      (cause) =>
        new InvalidWorkspaceDataError({
          cause,
        })
    )
  );
