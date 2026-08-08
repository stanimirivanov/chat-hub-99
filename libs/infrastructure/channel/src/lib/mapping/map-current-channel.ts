import { Effect, Schema } from 'effect';
import {
  InvalidChannelDataError,
  type ChannelRepositoryReadError,
} from '@omoikane/application/channel';
import {
  ArchivedChannelSchema,
  ChannelSchema,
  type ArchivedChannel,
  type Channel,
} from '@omoikane/domain/channel';

const decodeChannel = Schema.decodeUnknown(ChannelSchema);
const decodeArchivedChannel = Schema.decodeUnknown(ArchivedChannelSchema);

/**
 * Narrow database-row projection selected by channel navigation.
 *
 * PostgreSQL view metadata reports these columns as nullable, so every
 * RLS-visible row is decoded before it crosses the infrastructure boundary.
 */
export interface CurrentChannelNavigationRow {
  readonly channel_id: string | null;
  readonly workspace_id: string | null;
  readonly name: string | null;
  readonly slug: string | null;
  readonly description: string | null;
}

/** Provider projection required to identify an archived channel snapshot. */
export interface ArchivedChannelNavigationRow
  extends CurrentChannelNavigationRow {
  readonly updated_at: string | null;
}

/**
 * Decodes one current-channel row into the channel domain projection.
 */
export const mapCurrentChannel = (
  row: CurrentChannelNavigationRow
): Effect.Effect<Channel, ChannelRepositoryReadError> =>
  decodeChannel({
    id: row.channel_id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
  }).pipe(
    Effect.mapError(
      (cause) =>
        new InvalidChannelDataError({
          cause,
        })
    )
  );

/** Decodes one archived row without admitting it to active navigation. */
export const mapArchivedChannel = (
  row: ArchivedChannelNavigationRow
): Effect.Effect<ArchivedChannel, ChannelRepositoryReadError> =>
  decodeArchivedChannel({
    id: row.channel_id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    archivedAt: row.updated_at,
  }).pipe(
    Effect.mapError(
      (cause) =>
        new InvalidChannelDataError({
          cause,
        })
    )
  );
