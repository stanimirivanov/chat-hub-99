import { Effect, Schema } from 'effect';
import { InvalidWorkspaceDataError } from '@omoikane/application/workspace';
import {
  ArchivedWorkspaceSchema,
  WorkspaceSchema,
  type ArchivedWorkspace,
  type Workspace,
} from '@omoikane/domain/workspace';

const decodeWorkspace = Schema.decodeUnknown(WorkspaceSchema);
const decodeArchivedWorkspace = Schema.decodeUnknown(ArchivedWorkspaceSchema);

/**
 * Narrow external workspace projection shared by query and command adapters.
 *
 * Generated view columns remain nullable because PostgreSQL view metadata
 * cannot express all underlying constraints. Runtime decoding below rejects
 * missing required values.
 */
export interface WorkspaceProjectionRow {
  readonly workspace_id: string | null;
  readonly name: string | null;
  readonly slug: string | null;
  readonly description: string | null;
}

/** Provider projection required to identify an archived workspace snapshot. */
export interface ArchivedWorkspaceProjectionRow extends WorkspaceProjectionRow {
  readonly version_created_at: string | null;
}

/**
 * Decodes one generated current-workspace row into the domain projection.
 *
 * Schema failures are translated into the application repository vocabulary,
 * so malformed database values never escape as domain workspaces.
 */
export const mapCurrentWorkspace = (
  row: WorkspaceProjectionRow
): Effect.Effect<Workspace, InvalidWorkspaceDataError> =>
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

/** Decodes one archived view row without representing it as active. */
export const mapArchivedWorkspace = (
  row: ArchivedWorkspaceProjectionRow
): Effect.Effect<ArchivedWorkspace, InvalidWorkspaceDataError> =>
  decodeArchivedWorkspace({
    id: row.workspace_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    archivedAt: row.version_created_at,
  }).pipe(
    Effect.mapError(
      (cause) =>
        new InvalidWorkspaceDataError({
          cause,
        })
    )
  );
