import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type {
  ChannelId,
  Message,
  MessageContent,
  MessageId,
} from '@chat-hub/domain/message';
import { MessageApplicationService } from '../../core/message/message-application.service';
import { ChannelMessagesStore } from './channel-messages.store';

const channelId = '00000000-0000-4000-8000-000000000001' as ChannelId;

describe('ChannelMessagesStore', () => {
  it('loads messages for the selected channel', async () => {
    const listChannelMessages = vi.fn().mockResolvedValue({
      messages: [],
      nextCursor: null,
    });

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: {
            listChannelMessages,
          },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);

    await store.selectChannel(channelId);

    expect(listChannelMessages).toHaveBeenCalledOnce();

    expect(listChannelMessages).toHaveBeenCalledWith({
      channelId,
      limit: 50,
    });

    expect(store.channelId()).toBe(channelId);

    expect(store.loadStatus()).toBe('loaded');

    expect(store.messages()).toEqual([]);

    expect(store.nextCursor()).toBeNull();

    expect(store.error()).toBeNull();
  });

  it('records an initial loading failure', async () => {
    const applicationError = {
      _tag: 'MessageRepositoryUnavailableError',
      message: 'Message storage is unavailable.',
    };

    const listChannelMessages = vi.fn().mockRejectedValue(applicationError);

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: {
            listChannelMessages,
          },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);

    await store.selectChannel(channelId);

    expect(store.loadStatus()).toBe('failed');

    expect(store.messages()).toEqual([]);

    expect(store.error()).toEqual({
      tag: 'MessageRepositoryUnavailableError',
      message: 'Message storage is unavailable.',
    });
  });

  it('creates and prepends a message in the selected channel', async () => {
    const message: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      status: 'active',
      content: 'Hello' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };

    const listChannelMessages = vi.fn().mockResolvedValue({
      messages: [],
      nextCursor: null,
    });
    const createMessage = vi.fn().mockResolvedValue(message);

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: {
            listChannelMessages,
            createMessage,
          },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);

    await store.selectChannel(channelId);

    await expect(store.send('Hello')).resolves.toBe(true);

    expect(createMessage).toHaveBeenCalledWith({
      channelId,
      content: 'Hello',
    });
    expect(store.messages()).toEqual([message]);
    expect(store.sendMessageStatus()).toBe('idle');
    expect(store.sendError()).toBeNull();
  });

  it('keeps the composer failure separate from message loading state', async () => {
    const listChannelMessages = vi.fn().mockResolvedValue({
      messages: [],
      nextCursor: null,
    });
    const createMessage = vi.fn().mockRejectedValue({
      _tag: 'InvalidMessageContentError',
      message: 'The message content is invalid.',
    });

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: {
            listChannelMessages,
            createMessage,
          },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);

    await store.selectChannel(channelId);

    await expect(store.send('   ')).resolves.toBe(false);

    expect(store.loadStatus()).toBe('loaded');
    expect(store.sendMessageStatus()).toBe('failed');
    expect(store.sendError()).toEqual({
      tag: 'InvalidMessageContentError',
      message: 'The message content is invalid.',
    });
  });
});
