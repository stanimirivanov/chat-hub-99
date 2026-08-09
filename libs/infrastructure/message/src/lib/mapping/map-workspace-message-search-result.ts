import { Effect, Schema } from 'effect';
import {
  ChannelIdSchema,
  ChannelNameSchema,
  ChannelSlugSchema,
} from '@omoikane/domain/channel';
import {
  InvalidMessageDataError,
  type WorkspaceMessageSearchResult,
} from '@omoikane/application/message';
import type {
  CurrentMessage,
  SearchWorkspaceMessagesResult,
} from '@omoikane/shared/database';
import { mapCurrentMessage } from './map-current-message';

type SearchRow = SearchWorkspaceMessagesResult[number];

const MessageSearchChannelSchema = Schema.Struct({
  id: ChannelIdSchema,
  name: ChannelNameSchema,
  slug: ChannelSlugSchema,
});

const decodeChannel = Schema.decodeUnknown(MessageSearchChannelSchema);

/** Validates an RPC row into the provider-independent search projection. */
export const mapWorkspaceMessageSearchResult = (
  row: SearchRow
): Effect.Effect<WorkspaceMessageSearchResult, InvalidMessageDataError> => {
  const currentMessage: CurrentMessage = {
    author_user_id: row.author_user_id,
    channel_id: row.channel_id,
    content: row.content,
    created_at: row.created_at,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    is_edited: row.is_edited,
    message_id: row.message_id,
    message_status: row.message_status,
    message_version_id: row.message_version_id,
    updated_at: row.updated_at,
    version_created_at: row.version_created_at,
    version_created_by: row.version_created_by,
    version_number: row.version_number,
    workspace_id: row.workspace_id,
  };

  return Effect.all({
    message: mapCurrentMessage(currentMessage).pipe(
      Effect.flatMap((message) =>
        message.status === 'active'
          ? Effect.succeed(message)
          : Effect.fail(
              new InvalidMessageDataError({
                cause: 'Workspace message search returned a deleted message.',
              })
            )
      )
    ),
    channel: decodeChannel({
      id: row.channel_id,
      name: row.channel_name,
      slug: row.channel_slug,
    }).pipe(
      Effect.mapError(
        (cause) =>
          new InvalidMessageDataError({
            cause,
          })
      )
    ),
  });
};
