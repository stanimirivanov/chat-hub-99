import { describe, expect, it } from 'vitest';
import type { ChannelId } from '@chat-hub/domain/channel';
import type {
  Message,
  MessageContent,
  MessageId,
} from '@chat-hub/domain/message';
import { replaceMessage } from './replace-message';

const channelId = '00000000-0000-4000-8000-000000000001' as ChannelId;
const messageId = '00000000-0000-4000-8000-000000000002' as MessageId;

const message: Message = {
  id: messageId,
  channelId,
  status: 'active',
  content: 'Before' as MessageContent,
  createdAt: new Date('2026-07-27T08:00:00.000Z'),
  editedAt: null,
};

describe('replaceMessage', () => {
  it('replaces the matching projection without changing its position', () => {
    const replacement: Message = {
      ...message,
      content: 'After' as MessageContent,
      editedAt: new Date('2026-07-28T08:00:00.000Z'),
    };

    expect(replaceMessage([message], replacement)).toEqual([replacement]);
  });

  it('leaves the page unchanged when the message is absent', () => {
    const replacement: Message = {
      ...message,
      id: '00000000-0000-4000-8000-000000000003' as MessageId,
    };

    expect(replaceMessage([message], replacement)).toEqual([message]);
  });
});
