import type { MessageChange } from '@omoikane/application/message';
import type {
  Message,
  MessageContent,
  MessageId,
} from '@omoikane/domain/message';
import type { ChannelId } from '@omoikane/domain/channel';
import type { ProfileId } from '@omoikane/domain/profile';
import { describe, expect, it } from 'vitest';
import { reconcileMessageChange } from './reconcile-message-change';

const message: Message = {
  id: '00000000-0000-4000-8000-000000000001' as MessageId,
  channelId: '00000000-0000-4000-8000-000000000002' as ChannelId,
  authorId: '00000000-0000-4000-8000-000000000003' as ProfileId,
  status: 'active',
  content: 'Before' as MessageContent,
  createdAt: new Date('2026-07-31T08:00:00.000Z'),
  editedAt: null,
};

describe('reconcileMessageChange', () => {
  it('prepends a newly created message', () => {
    const created: Message = {
      ...message,
      id: '00000000-0000-4000-8000-000000000004' as MessageId,
    };

    expect(
      reconcileMessageChange([message], {
        kind: 'created',
        message: created,
      })
    ).toEqual([created, message]);
  });

  it('replaces an existing optimistic create with the authoritative projection', () => {
    const authoritative: Message = {
      ...message,
      content: 'Authoritative' as MessageContent,
    };

    expect(
      reconcileMessageChange([message], {
        kind: 'created',
        message: authoritative,
      })
    ).toEqual([authoritative]);
  });

  it('replaces a loaded update without changing its position', () => {
    const updated: Message = {
      ...message,
      content: 'After' as MessageContent,
      editedAt: new Date('2026-07-31T09:00:00.000Z'),
    };
    const change: MessageChange = {
      kind: 'updated',
      message: updated,
    };

    expect(reconcileMessageChange([message], change)).toEqual([updated]);
  });

  it('ignores an update for a message outside the loaded page', () => {
    const updated: Message = {
      ...message,
      id: '00000000-0000-4000-8000-000000000005' as MessageId,
    };

    expect(
      reconcileMessageChange([message], {
        kind: 'updated',
        message: updated,
      })
    ).toEqual([message]);
  });
});
