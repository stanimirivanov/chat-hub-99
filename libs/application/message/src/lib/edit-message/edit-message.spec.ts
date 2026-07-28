import { Effect } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { editMessage } from './edit-message';
import type { MessageRepository } from '../repository';
import {
  activeMessage,
  makeMessageRepositoryLayer,
  messageId,
} from '../testing';

describe('editMessage', () => {
  it('normalizes content, edits the message, and returns its projection', async () => {
    const edit: MessageRepository['edit'] = vi.fn(() => Effect.void);
    const findById: MessageRepository['findById'] = vi.fn(() =>
      Effect.succeed(activeMessage)
    );

    const result = await Effect.runPromise(
      editMessage({ messageId, content: '  Hello  ' }).pipe(
        Effect.provide(makeMessageRepositoryLayer({ edit, findById }))
      )
    );

    expect(result).toEqual(activeMessage);
    expect(edit).toHaveBeenCalledExactlyOnceWith({
      messageId,
      content: activeMessage.content,
    });
    expect(findById).toHaveBeenCalledExactlyOnceWith(messageId);
  });

  it('rejects invalid content before calling the repository', async () => {
    const edit: MessageRepository['edit'] = vi.fn();
    const findById: MessageRepository['findById'] = vi.fn();

    const result = await Effect.runPromise(
      editMessage({ messageId, content: '   ' }).pipe(
        Effect.provide(makeMessageRepositoryLayer({ edit, findById })),
        Effect.either
      )
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidEditedMessageContentError' },
    });
    expect(edit).not.toHaveBeenCalled();
    expect(findById).not.toHaveBeenCalled();
  });
});
