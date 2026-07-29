import type { ChannelMessagesError } from '../channel-messages.state';

/**
 * Converts an application failure into stable presentation state.
 */
export const toChannelMessagesError = (
  error: unknown
): ChannelMessagesError => ({
  tag: hasStringProperty(error, '_tag')
    ? error._tag
    : 'UnknownChannelMessagesError',

  message: hasStringProperty(error, 'message')
    ? error.message
    : 'The channel messages could not be loaded.',
});

const hasStringProperty = <K extends string>(
  value: unknown,
  property: K
): value is Record<K, string> =>
  typeof value === 'object' &&
  value !== null &&
  property in value &&
  typeof Reflect.get(value, property) === 'string';
