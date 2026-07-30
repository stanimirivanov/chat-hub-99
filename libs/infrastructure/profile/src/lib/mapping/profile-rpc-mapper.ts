import type { UpdateCurrentProfileCommand } from '@chat-hub/application/profile';
import type { UpdateMyProfileArgs } from '@chat-hub/shared/database';

/**
 * Maps a validated self-service profile command to generated RPC arguments.
 *
 * Null optional values are omitted so PostgreSQL applies the function's
 * default `NULL`, which clears the corresponding current value.
 */
export const toUpdateMyProfileArgs = (
  command: UpdateCurrentProfileCommand
): UpdateMyProfileArgs => ({
  p_display_name: command.displayName,
  ...(command.username === null ? {} : { p_username: command.username }),
  ...(command.avatarUrl === null ? {} : { p_avatar_url: command.avatarUrl }),
});
