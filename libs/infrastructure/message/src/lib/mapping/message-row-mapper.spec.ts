import { describe, expect, it } from 'vitest';
import { Effect } from 'effect';

import type { CurrentMessage } from '@chat-hub/shared/database';
import { toMessage } from './message-row-mapper';

const activeRow: CurrentMessage = {
  author_user_id: '00000000-0000-4000-8000-000000000010',
  channel_id: '00000000-0000-4000-8000-000000000020',
  content: 'Hello',
  created_at: '2026-07-26T18:00:00.000Z',
  deleted_at: null,
  deleted_by: null,
  is_edited: false,
  message_id: '00000000-0000-4000-8000-000000000030',
  message_status: 'active',
  message_version_id: '00000000-0000-4000-8000-000000000040',
  updated_at: '2026-07-26T18:00:00.000Z',
  version_created_at: '2026-07-26T18:00:00.000Z',
  version_created_by: '00000000-0000-4000-8000-000000000010',
  version_number: 1,
  workspace_id: '00000000-0000-4000-8000-000000000050',
};

describe('message row mapper', () => {
  it('maps an active message', async () => {
    const message = await Effect.runPromise(toMessage(activeRow));

    expect(message).toEqual({
      id: activeRow.message_id,
      channelId: activeRow.channel_id,
      authorId: activeRow.author_user_id,
      status: 'active',
      content: 'Hello',
      createdAt: new Date('2026-07-26T18:00:00.000Z'),
      editedAt: null,
    });
  });

  it('maps an edited active message', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      content: 'Edited content',
      is_edited: true,
      version_created_at: '2026-07-26T18:05:00.000Z',
      version_number: 2,
    };

    const message = await Effect.runPromise(toMessage(row));

    expect(message).toEqual({
      id: row.message_id,
      channelId: row.channel_id,
      authorId: row.author_user_id,
      status: 'active',
      content: 'Edited content',
      createdAt: new Date('2026-07-26T18:00:00.000Z'),
      editedAt: new Date('2026-07-26T18:05:00.000Z'),
    });
  });

  it('maps a deleted message', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      content: null,
      deleted_at: '2026-07-26T18:10:00.000Z',
      deleted_by: '00000000-0000-4000-8000-000000000010',
      message_status: 'deleted',
      updated_at: '2026-07-26T18:10:00.000Z',
    };

    const message = await Effect.runPromise(toMessage(row));

    expect(message).toEqual({
      id: row.message_id,
      channelId: row.channel_id,
      authorId: row.author_user_id,
      status: 'deleted',
      content: null,
      createdAt: new Date('2026-07-26T18:00:00.000Z'),
      editedAt: null,
      deletedAt: new Date('2026-07-26T18:10:00.000Z'),
    });
  });

  it('rejects a row without a message ID', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      message_id: null,
    };

    const result = await Effect.runPromise(Effect.either(toMessage(row)));

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageRowMappingError');
    }
  });

  it('rejects a row without an author identity', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      author_user_id: null,
    };

    const result = await Effect.runPromise(Effect.either(toMessage(row)));

    expect(result._tag).toBe('Left');
  });

  it('rejects an active row without content', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      content: null,
    };

    const result = await Effect.runPromise(Effect.either(toMessage(row)));

    expect(result._tag).toBe('Left');
  });

  it('rejects an unsupported status', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      message_status: 'archived',
    };

    const result = await Effect.runPromise(Effect.either(toMessage(row)));

    expect(result._tag).toBe('Left');

    if (result._tag === 'Left') {
      expect(result.left._tag).toBe('MessageRowMappingError');
    }
  });

  it('rejects a deleted row without deleted_at', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      content: null,
      message_status: 'deleted',
      deleted_at: null,
    };

    const result = await Effect.runPromise(Effect.either(toMessage(row)));

    expect(result._tag).toBe('Left');
  });

  it('rejects an invalid creation timestamp', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      created_at: 'not-a-date',
    };

    const result = await Effect.runPromise(Effect.either(toMessage(row)));

    expect(result._tag).toBe('Left');
  });

  it('rejects an edited row with an invalid edit timestamp', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      is_edited: true,
      version_created_at: 'invalid-date',
    };

    const result = await Effect.runPromise(Effect.either(toMessage(row)));

    expect(result._tag).toBe('Left');
  });

  it('rejects a deleted row with an invalid deletion timestamp', async () => {
    const row: CurrentMessage = {
      ...activeRow,
      content: null,
      message_status: 'deleted',
      deleted_at: 'invalid-date',
    };

    const result = await Effect.runPromise(Effect.either(toMessage(row)));

    expect(result._tag).toBe('Left');
  });
});
