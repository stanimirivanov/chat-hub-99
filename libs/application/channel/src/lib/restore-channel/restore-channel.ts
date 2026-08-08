import { Effect } from 'effect';
import type { Channel } from '@chat-hub/domain/channel';
import { decodeChannelId } from '../channel-identity/decode-channel-id';
import { ChannelRepositoryTag, type ChannelRepository } from '../repository';
import {
  InvalidChannelRestoreInputError,
  type RestoreChannelError,
} from './restore-channel-error';

/**
 * Restores one archived channel through authenticated workspace-owner authority.
 *
 * The identity is validated before repository access. The returned Effect
 * produces a validated active channel, preserves typed command failures, and
 * requires `ChannelRepository` to be supplied by the runtime.
 */
export const restoreChannel = (
  input: unknown
): Effect.Effect<Channel, RestoreChannelError, ChannelRepository> =>
  Effect.gen(function* () {
    const channelId = yield* decodeChannelId(
      input,
      (cause) => new InvalidChannelRestoreInputError({ cause })
    );
    const repository = yield* ChannelRepositoryTag;

    return yield* repository.restore(channelId);
  });
