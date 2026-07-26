import { Schema } from 'effect';

export const MESSAGE_CONTENT_MAX_LENGTH = 4_000;

export const MessageContentSchema = Schema.Trim.pipe(
  Schema.trimmed(),
  Schema.minLength(1, {
    message: () => 'A message cannot be empty',
  }),
  Schema.maxLength(MESSAGE_CONTENT_MAX_LENGTH, {
    message: () =>
      `A message cannot exceed ${MESSAGE_CONTENT_MAX_LENGTH} characters`,
  }),
  Schema.brand('MessageContent')
);

export type MessageContent = typeof MessageContentSchema.Type;
