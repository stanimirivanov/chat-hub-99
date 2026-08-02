import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { messageRevisionRow } from '../testing';
import { toMessageRevision } from './message-revision-row-mapper';

describe('toMessageRevision', () => {
  it('maps and validates a persisted revision', async () => {
    const revision = await Effect.runPromise(
      toMessageRevision(messageRevisionRow)
    );

    expect(revision).toMatchObject({
      id: messageRevisionRow.message_version_id,
      messageId: messageRevisionRow.message_id,
      versionNumber: messageRevisionRow.version_number,
      content: messageRevisionRow.content,
      createdBy: messageRevisionRow.created_by,
      createdAt: new Date(messageRevisionRow.created_at),
    });
  });

  it('rejects an invalid timestamp', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        toMessageRevision({
          ...messageRevisionRow,
          created_at: 'not-a-timestamp',
        })
      )
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'MessageRowMappingError' },
    });
  });
});
