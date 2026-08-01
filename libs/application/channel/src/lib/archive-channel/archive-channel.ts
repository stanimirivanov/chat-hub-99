import { Effect } from 'effect';
import { decodeChannelId } from '../channel-identity/decode-channel-id';
import { ChannelRepositoryTag, type ChannelRepository } from '../repository';
import {
  InvalidChannelArchiveInputError,
  type ArchiveChannelError,
} from './archive-channel-error';

/**
 * Archives one active channel through the authenticated repository command.
 *
 * The channel identity is validated before repository access. Success is a
 * `void` acknowledgment because archived channels are excluded from active
 * domain projections. The Effect preserves typed command failures and requires
 * `ChannelRepository`.
 */
export const archiveChannel = (
  input: unknown
): Effect.Effect<void, ArchiveChannelError, ChannelRepository> =>
  Effect.gen(function* () {
    const channelId = yield* decodeChannelId(
      input,
      (cause) => new InvalidChannelArchiveInputError({ cause })
    );
    const repository = yield* ChannelRepositoryTag;

    return yield* repository.archive(channelId);
  });
