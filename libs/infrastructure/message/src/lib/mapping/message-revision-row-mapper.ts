import { Effect, Schema } from 'effect';
import type { TableRow } from '@chat-hub/shared/database';
import {
  MessageRevisionSchema,
  type MessageRevision,
} from '@chat-hub/domain/message';
import { MessageRowMappingError } from './message-row-mapping-error';
import { parseRequiredTimestamp } from './parse-required-timestamp';

export type MessageRevisionRow = TableRow<'message_versions'>;

const decodeRevision = Schema.decodeUnknown(MessageRevisionSchema);

/** Validates one persisted revision row as a domain value. */
export const toMessageRevision = (
  row: MessageRevisionRow
): Effect.Effect<MessageRevision, MessageRowMappingError> =>
  Effect.gen(function* () {
    const createdAt = yield* parseRequiredTimestamp(
      'created_at',
      row.created_at
    );

    return yield* decodeRevision({
      id: row.message_version_id,
      messageId: row.message_id,
      versionNumber: row.version_number,
      content: row.content,
      createdBy: row.created_by,
      createdAt,
    }).pipe(
      Effect.mapError(
        (cause) =>
          new MessageRowMappingError({
            message:
              'Message revision row does not satisfy MessageRevisionSchema.',
            cause,
          })
      )
    );
  });
