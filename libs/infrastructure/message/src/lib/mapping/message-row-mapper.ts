import { Effect, Schema } from 'effect';

import type { CurrentMessage } from '@chat-hub/shared/database';
import { MessageSchema, type Message } from '@chat-hub/domain/message';
import { MessageRowMappingError } from './message-row-mapping-error';

const decodeMessage = Schema.decodeUnknown(MessageSchema);

export const toMessage = (
  row: CurrentMessage
): Effect.Effect<Message, MessageRowMappingError> =>
  Effect.gen(function* () {
    const createdAt = yield* parseRequiredTimestamp(
      'created_at',
      row.created_at
    );

    const editedAt = yield* parseEditedAt(row);

    switch (row.message_status) {
      case 'active':
        return yield* decode({
          id: row.message_id,
          channelId: row.channel_id,
          authorId: row.author_user_id,
          status: 'active',
          content: row.content,
          createdAt,
          editedAt,
        });

      case 'deleted': {
        const deletedAt = yield* parseRequiredTimestamp(
          'deleted_at',
          row.deleted_at
        );

        return yield* decode({
          id: row.message_id,
          channelId: row.channel_id,
          authorId: row.author_user_id,
          status: 'deleted',
          content: null,
          createdAt,
          editedAt,
          deletedAt,
        });
      }

      default:
        return yield* Effect.fail(
          new MessageRowMappingError({
            message:
              'Current message row has an unsupported or missing status.',
            cause: {
              messageId: row.message_id,
              messageStatus: row.message_status,
            },
          })
        );
    }
  });

const decode = (
  input: unknown
): Effect.Effect<Message, MessageRowMappingError> =>
  decodeMessage(input).pipe(
    Effect.mapError(
      (cause) =>
        new MessageRowMappingError({
          message: 'Current message row does not satisfy MessageSchema.',
          cause,
        })
    )
  );

const parseEditedAt = (
  row: CurrentMessage
): Effect.Effect<Date | null, MessageRowMappingError> => {
  if (row.is_edited !== true) {
    return Effect.succeed(null);
  }

  return parseRequiredTimestamp('version_created_at', row.version_created_at);
};

const parseRequiredTimestamp = (
  field: string,
  value: string | null
): Effect.Effect<Date, MessageRowMappingError> => {
  if (value === null) {
    return Effect.fail(
      new MessageRowMappingError({
        message: `Required database field "${field}" is null.`,
      })
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return Effect.fail(
      new MessageRowMappingError({
        message: `Database field "${field}" contains an invalid timestamp.`,
        cause: value,
      })
    );
  }

  return Effect.succeed(date);
};
