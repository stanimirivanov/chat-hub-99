import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import type { ChannelId } from '@chat-hub/domain/message';
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
});
