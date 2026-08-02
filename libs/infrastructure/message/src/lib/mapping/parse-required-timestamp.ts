import { Effect } from 'effect';
import { MessageRowMappingError } from './message-row-mapping-error';

/** Parses a required database timestamp at the infrastructure boundary. */
export const parseRequiredTimestamp = (
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
