import { Effect } from 'effect';
import {
  MessageRepositoryTag,
  type MessageRepository,
  type MessageRepositoryError,
} from '../repository';
import type { MarkChannelReadInput } from './mark-channel-read-input';

/**
 * Advances the authenticated member's read position through the exact newest
 * message loaded by the presentation. Persistence guarantees that a stale
 * concurrent command cannot move the position backwards.
 */
export const markChannelRead = (
  input: MarkChannelReadInput
): Effect.Effect<void, MessageRepositoryError, MessageRepository> =>
  Effect.gen(function* () {
    const repository = yield* MessageRepositoryTag;
    return yield* repository.markRead(input);
  });
