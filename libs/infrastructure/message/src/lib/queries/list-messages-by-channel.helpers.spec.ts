import { describe, expect, it } from 'vitest';

import {
  buildMessagePage,
  toBeforeCursorFilter,
} from './list-messages-by-channel';
import { makeActiveMessage, messageId } from '../testing';

describe('toBeforeCursorFilter', () => {
  it('builds a stable compound keyset filter', () => {
    const cursor = {
      createdAt: new Date('2026-07-26T18:00:00.000Z'),
      messageId,
    };

    expect(toBeforeCursorFilter(cursor)).toBe(
      [
        'created_at.lt.2026-07-26T18:00:00.000Z',
        `and(created_at.eq.2026-07-26T18:00:00.000Z,message_id.lt.${messageId})`,
      ].join(',')
    );
  });
});

describe('buildMessagePage', () => {
  it('removes the look-ahead message', () => {
    const firstMessage = makeActiveMessage({
      content: 'First',
    });

    const lookAheadMessage = makeActiveMessage({
      id: '00000000-0000-4000-8000-000000000031',
      content: 'Look-ahead',
      createdAt: new Date('2026-07-26T17:00:00.000Z'),
    });

    const page = buildMessagePage([firstMessage, lookAheadMessage], 1);

    expect(page.messages).toHaveLength(1);
    expect(page.messages[0]).toEqual(firstMessage);

    expect(page.nextCursor).toEqual({
      createdAt: firstMessage.createdAt,
      messageId: firstMessage.id,
    });
  });
});
