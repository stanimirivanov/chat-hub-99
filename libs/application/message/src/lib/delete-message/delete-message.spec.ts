import { Effect, Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import {
  MessageAccessDeniedError,
  MessageMutationNotAllowedError,
  type MessageRepository,
} from '../repository';
import {
  deletedMessage,
  makeMessageRepositoryLayer,
  messageId,
} from '../testing';
import { deleteMessage } from './delete-message';

describe('deleteMessage', () => {
  it('deletes the message and returns its current projection', async () => {
    const deleteRepositoryMessage: MessageRepository['delete'] = vi.fn(
      () => Effect.void
    );

    const findById: MessageRepository['findById'] = vi.fn(() =>
      Effect.succeed(deletedMessage)
    );

    const result = await Effect.runPromise(
      deleteMessage({ messageId }).pipe(
        Effect.provide(
          makeMessageRepositoryLayer({
            delete: deleteRepositoryMessage,
            findById,
          })
        )
      )
    );

    expect(result).toEqual(deletedMessage);

    expect(deleteRepositoryMessage).toHaveBeenCalledExactlyOnceWith({
      messageId,
    });

    expect(findById).toHaveBeenCalledExactlyOnceWith(messageId);
  });

  it('does not read the projection when deletion fails', async () => {
    const repositoryError = new MessageAccessDeniedError({
      operation: 'delete',
    });

    const deleteRepositoryMessage: MessageRepository['delete'] = vi.fn(() =>
      Effect.fail(repositoryError)
    );

    const findById: MessageRepository['findById'] = vi.fn();

    const result = await Effect.runPromise(
      deleteMessage({ messageId }).pipe(
        Effect.provide(
          makeMessageRepositoryLayer({
            delete: deleteRepositoryMessage,
            findById,
          })
        ),
        Effect.either
      )
    );

    Either.match(result, {
      onLeft: (error) => {
        expect(error).toBe(repositoryError);
      },
      onRight: () => {
        throw new Error('Expected Left');
      },
    });

    expect(findById).not.toHaveBeenCalled();
  });

  it('preserves an authoritative lifecycle rejection', async () => {
    const repositoryError = new MessageMutationNotAllowedError({
      messageId,
      operation: 'delete',
    });
    const deleteRepositoryMessage: MessageRepository['delete'] = vi.fn(() =>
      Effect.fail(repositoryError)
    );
    const findById: MessageRepository['findById'] = vi.fn();

    const result = await Effect.runPromise(
      deleteMessage({ messageId }).pipe(
        Effect.provide(
          makeMessageRepositoryLayer({
            delete: deleteRepositoryMessage,
            findById,
          })
        ),
        Effect.either
      )
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: {
        _tag: 'MessageMutationNotAllowedError',
        messageId,
        operation: 'delete',
      },
    });
    expect(findById).not.toHaveBeenCalled();
  });
});
