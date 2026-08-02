import { Effect, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { MessageRevisionNumberSchema } from '@chat-hub/domain/message';
import type { MessageRevisionPage } from '../pagination';
import { makeListRevisionsRepository, messageId } from '../testing';
import { listMessageRevisions } from './list-message-revisions';

const emptyPage: MessageRevisionPage = {
  revisions: [],
  nextCursor: null,
};

describe('listMessageRevisions', () => {
  it('uses the default page size', async () => {
    const { listRevisions, repositoryLayer } = makeListRevisionsRepository(() =>
      Effect.succeed(emptyPage)
    );

    await Effect.runPromise(
      listMessageRevisions({ messageId }).pipe(Effect.provide(repositoryLayer))
    );

    expect(listRevisions).toHaveBeenCalledExactlyOnceWith({
      messageId,
      limit: 20,
      before: undefined,
    });
  });

  it('passes an explicit page size and cursor', async () => {
    const before = {
      versionNumber: Schema.decodeUnknownSync(MessageRevisionNumberSchema)(3),
    };
    const { listRevisions, repositoryLayer } = makeListRevisionsRepository(() =>
      Effect.succeed(emptyPage)
    );

    await Effect.runPromise(
      listMessageRevisions({ messageId, limit: 10, before }).pipe(
        Effect.provide(repositoryLayer)
      )
    );

    expect(listRevisions).toHaveBeenCalledExactlyOnceWith({
      messageId,
      limit: 10,
      before,
    });
  });

  it.each([0, -1, 101, 10.5])('rejects invalid page size %s', async (limit) => {
    const { listRevisions, repositoryLayer } = makeListRevisionsRepository(() =>
      Effect.succeed(emptyPage)
    );

    const error = await Effect.runPromise(
      listMessageRevisions({ messageId, limit }).pipe(
        Effect.provide(repositoryLayer),
        Effect.flip
      )
    );

    expect(error).toMatchObject({
      _tag: 'InvalidMessageRevisionPageLimitError',
      limit,
    });
    expect(listRevisions).not.toHaveBeenCalled();
  });
});
