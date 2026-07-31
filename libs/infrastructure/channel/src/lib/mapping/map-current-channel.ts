import { Effect, Schema } from 'effect';
import {
  InvalidChannelDataError,
  type ChannelRepositoryReadError,
} from '@chat-hub/application/channel';
import { ChannelSchema, type Channel } from '@chat-hub/domain/channel';

const decodeChannel = Schema.decodeUnknown(ChannelSchema);

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
