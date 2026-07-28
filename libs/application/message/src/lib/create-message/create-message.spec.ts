import { Effect } from 'effect';
import { describe, expect, it, vi } from 'vitest';

import { createMessage } from './create-message';
import type { MessageRepository } from '../repository';
import {
  activeMessage,
  channelId,
  messageId,
  makeMessageRepositoryLayer,
} from '../testing';

describe('createMessage', () => {
  it('normalizes content, creates the message, and returns its projection', async () => {
    const create: MessageRepository['create'] = vi.fn(() =>
      Effect.succeed(messageId)
    );

    const findById: MessageRepository['findById'] = vi.fn(() =>
      Effect.succeed(activeMessage)
    );

    const result = await Effect.runPromise(
      createMessage({
        channelId,
        content: '  Hello  ',
      }).pipe(
        Effect.provide(
          makeMessageRepositoryLayer({
            create,
            findById,
          })
        )
      )
    );

    expect(result).toEqual(activeMessage);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      channelId,
      content: activeMessage.content,
    });

    expect(findById).toHaveBeenCalledExactlyOnceWith(messageId);
  });

  it.each(['', ' ', '   '])(
    'rejects invalid content %j before calling the repository',
    async (content) => {
      const create: MessageRepository['create'] = vi.fn();
      const findById: MessageRepository['findById'] = vi.fn();

      const result = await Effect.runPromise(
        createMessage({
          channelId,
          content,
        }).pipe(
          Effect.provide(
            makeMessageRepositoryLayer({
              create,
              findById,
            })
          ),
          Effect.either
        )
      );

      expect(result).toMatchObject({
        _tag: 'Left',
        left: {
          _tag: 'InvalidMessageContentError',
        },
      });

      expect(create).not.toHaveBeenCalled();
      expect(findById).not.toHaveBeenCalled();
    }
  );
});
