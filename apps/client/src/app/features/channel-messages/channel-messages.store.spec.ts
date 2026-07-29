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

const makeDeferredPromise = <Value>() => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

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

  it('ignores a created message after another channel is selected', async () => {
    const secondChannelId = '00000000-0000-4000-8000-000000000003' as ChannelId;

    const createdMessage: Message = {
      id: '00000000-0000-4000-8000-000000000004' as MessageId,
      channelId,
      status: 'active',
      content: 'Created in the first channel' as MessageContent,
      createdAt: new Date('2026-07-29T08:00:00.000Z'),
      editedAt: null,
    };

    const secondChannelMessage: Message = {
      id: '00000000-0000-4000-8000-000000000005' as MessageId,
      channelId: secondChannelId,
      status: 'active',
      content: 'Message from the second channel' as MessageContent,
      createdAt: new Date('2026-07-29T09:00:00.000Z'),
      editedAt: null,
    };

    const creation = makeDeferredPromise<Message>();

    const listChannelMessages = vi
      .fn()
      .mockResolvedValueOnce({
        messages: [],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        messages: [secondChannelMessage],
        nextCursor: null,
      });

    const createMessage = vi.fn().mockReturnValue(creation);

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

    const creationResult = store.send('Created in the first channel');

    expect(store.sendMessageStatus()).toBe('sending');

    await store.selectChannel(secondChannelId);

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondChannelMessage]);
    expect(store.sendMessageStatus()).toBe('idle');

    creation.resolve(createdMessage);

    await expect(creationResult).resolves.toBe(false);

    expect(createMessage).toHaveBeenCalledOnce();

    expect(createMessage).toHaveBeenCalledWith({
      channelId,
      content: 'Created in the first channel',
    });

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondChannelMessage]);
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

describe('ChannelMessagesStore message editing', () => {
  it('replaces the edited message projection in place', async () => {
    const message: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      status: 'active',
      content: 'Before' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };
    const editedMessage: Message = {
      ...message,
      content: 'After' as MessageContent,
      editedAt: new Date('2026-07-28T08:00:00.000Z'),
    };
    const listChannelMessages = vi.fn().mockResolvedValue({
      messages: [message],
      nextCursor: null,
    });
    const editMessage = vi.fn().mockResolvedValue(editedMessage);

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: { listChannelMessages, editMessage },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);
    await store.selectChannel(channelId);

    await expect(store.edit(message.id, 'After')).resolves.toBe(true);

    expect(editMessage).toHaveBeenCalledWith({
      messageId: message.id,
      content: 'After',
    });
    expect(store.messages()).toEqual([editedMessage]);
    expect(store.editMessageStatus()).toBe('idle');
    expect(store.editError()).toBeNull();
  });

  it('ignores an edited message after another channel is selected', async () => {
    const secondChannelId = '00000000-0000-4000-8000-000000000003' as ChannelId;

    const originalMessage: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      status: 'active',
      content: 'Before' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };

    const editedMessage: Message = {
      ...originalMessage,
      content: 'After' as MessageContent,
      editedAt: new Date('2026-07-29T08:00:00.000Z'),
    };

    const secondChannelMessage: Message = {
      id: '00000000-0000-4000-8000-000000000005' as MessageId,
      channelId: secondChannelId,
      status: 'active',
      content: 'Message from the second channel' as MessageContent,
      createdAt: new Date('2026-07-29T09:00:00.000Z'),
      editedAt: null,
    };

    const edit = makeDeferredPromise<Message>();

    const listChannelMessages = vi
      .fn()
      .mockResolvedValueOnce({
        messages: [originalMessage],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        messages: [secondChannelMessage],
        nextCursor: null,
      });

    const editMessage = vi.fn().mockReturnValue(edit);

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: {
            listChannelMessages,
            editMessage,
          },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);

    await store.selectChannel(channelId);

    const editResult = store.edit(originalMessage.id, 'After');

    expect(store.editMessageStatus()).toBe('editing');

    await store.selectChannel(secondChannelId);

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondChannelMessage]);
    expect(store.editMessageStatus()).toBe('idle');

    edit.resolve(editedMessage);

    await expect(editResult).resolves.toBe(false);

    expect(editMessage).toHaveBeenCalledOnce();

    expect(editMessage).toHaveBeenCalledWith({
      messageId: originalMessage.id,
      content: 'After',
    });

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondChannelMessage]);
    expect(store.editMessageStatus()).toBe('idle');
    expect(store.editError()).toBeNull();
  });

  it('keeps edit failure separate from loading and sending state', async () => {
    const message: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      status: 'active',
      content: 'Before' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };
    const listChannelMessages = vi.fn().mockResolvedValue({
      messages: [message],
      nextCursor: null,
    });
    const editMessage = vi.fn().mockRejectedValue({
      _tag: 'InvalidEditedMessageContentError',
      message: 'The edited message content is invalid.',
    });

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: { listChannelMessages, editMessage },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);
    await store.selectChannel(channelId);

    await expect(store.edit(message.id, '   ')).resolves.toBe(false);

    expect(store.loadStatus()).toBe('loaded');
    expect(store.sendMessageStatus()).toBe('idle');
    expect(store.editMessageStatus()).toBe('failed');
    expect(store.editError()).toEqual({
      tag: 'InvalidEditedMessageContentError',
      message: 'The edited message content is invalid.',
    });
    expect(store.messages()).toEqual([message]);
  });
});

describe('ChannelMessagesStore message deletion', () => {
  it('replaces the active message with its deleted projection', async () => {
    const message: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      status: 'active',
      content: 'Delete me' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };

    const deletedMessage: Message = {
      id: message.id,
      channelId,
      status: 'deleted',
      content: null,
      createdAt: message.createdAt,
      editedAt: null,
      deletedAt: new Date('2026-07-29T08:00:00.000Z'),
    };

    const listChannelMessages = vi.fn().mockResolvedValue({
      messages: [message],
      nextCursor: null,
    });

    const deleteMessage = vi.fn().mockResolvedValue(deletedMessage);

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: {
            listChannelMessages,
            deleteMessage,
          },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);

    await store.selectChannel(channelId);

    await expect(store.delete(message.id)).resolves.toBe(true);

    expect(deleteMessage).toHaveBeenCalledWith({
      messageId: message.id,
    });

    expect(store.messages()).toEqual([deletedMessage]);
    expect(store.deleteMessageStatus()).toBe('idle');
    expect(store.deleteError()).toBeNull();
  });

  it('keeps deletion failure separate from other feature state', async () => {
    const message: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      status: 'active',
      content: 'Delete me' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };

    const listChannelMessages = vi.fn().mockResolvedValue({
      messages: [message],
      nextCursor: null,
    });

    const deleteMessage = vi.fn().mockRejectedValue({
      _tag: 'MessageAccessDeniedError',
      message: 'Message access was denied.',
    });

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: {
            listChannelMessages,
            deleteMessage,
          },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);

    await store.selectChannel(channelId);

    await expect(store.delete(message.id)).resolves.toBe(false);

    expect(store.loadStatus()).toBe('loaded');
    expect(store.sendMessageStatus()).toBe('idle');
    expect(store.editMessageStatus()).toBe('idle');
    expect(store.deleteMessageStatus()).toBe('failed');

    expect(store.deleteError()).toEqual({
      tag: 'MessageAccessDeniedError',
      message: 'Message access was denied.',
    });

    expect(store.messages()).toEqual([message]);
  });

  it('ignores a deletion result after another channel is selected', async () => {
    const deletion = makeDeferredPromise<Message>();

    const secondChannelId = '00000000-0000-4000-8000-000000000003' as ChannelId;

    const message: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      status: 'active',
      content: 'Delete me' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };

    const deletedMessage: Message = {
      id: message.id,
      channelId,
      status: 'deleted',
      content: null,
      createdAt: message.createdAt,
      editedAt: null,
      deletedAt: new Date('2026-07-29T08:00:00.000Z'),
    };

    const secondChannelMessage: Message = {
      id: '00000000-0000-4000-8000-000000000005' as MessageId,
      channelId: secondChannelId,
      status: 'active',
      content: 'Message from the second channel' as MessageContent,
      createdAt: new Date('2026-07-29T09:00:00.000Z'),
      editedAt: null,
    };

    const listChannelMessages = vi
      .fn()
      .mockResolvedValueOnce({
        messages: [message],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        messages: [secondChannelMessage],
        nextCursor: null,
      });

    const deleteMessage = vi.fn().mockReturnValue(deletion);

    TestBed.configureTestingModule({
      providers: [
        ChannelMessagesStore,
        {
          provide: MessageApplicationService,
          useValue: {
            listChannelMessages,
            deleteMessage,
          },
        },
      ],
    });

    const store = TestBed.inject(ChannelMessagesStore);

    await store.selectChannel(channelId);

    const deletionResult = store.delete(message.id);

    expect(store.deleteMessageStatus()).toBe('deleting');

    await store.selectChannel(secondChannelId);

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondChannelMessage]);
    expect(store.deleteMessageStatus()).toBe('idle');

    deletion.resolve(deletedMessage);

    await expect(deletionResult).resolves.toBe(false);

    expect(deleteMessage).toHaveBeenCalledOnce();

    expect(deleteMessage).toHaveBeenCalledWith({
      messageId: message.id,
    });

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondChannelMessage]);
    expect(store.deleteMessageStatus()).toBe('idle');
    expect(store.deleteError()).toBeNull();
  });
});
