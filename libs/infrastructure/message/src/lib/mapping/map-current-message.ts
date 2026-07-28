import { Effect } from 'effect';
import { InvalidMessageDataError } from '@chat-hub/application/message';
import type { Message } from '@chat-hub/domain/message';
import type { CurrentMessage } from '@chat-hub/shared/database';
import { toMessage } from './message-row-mapper';

/**
 * Converts a database projection into the validated message domain model.
 *
 * Supabase-generated row types describe the database shape, but they do not
 * prove that values satisfy domain invariants at runtime. This adapter keeps
 * that validation at the infrastructure boundary and translates mapping
 * failures into the error vocabulary understood by the application layer.
 */
export const mapCurrentMessage = (
  row: CurrentMessage
): Effect.Effect<Message, InvalidMessageDataError> =>
  toMessage(row).pipe(
    Effect.mapError(
      (cause) =>
        new InvalidMessageDataError({
          cause,
        })
    )
  );
