import { Effect } from 'effect';
import { InvalidMessageDataError } from '@chat-hub/application/message';
import type { MessageRevision } from '@chat-hub/domain/message';
import {
  toMessageRevision,
  type MessageRevisionRow,
} from './message-revision-row-mapper';

/** Maps an external row into the repository's validated revision result. */
export const mapMessageRevision = (
  row: MessageRevisionRow
): Effect.Effect<MessageRevision, InvalidMessageDataError> =>
  toMessageRevision(row).pipe(
    Effect.mapError((cause) => new InvalidMessageDataError({ cause }))
  );
