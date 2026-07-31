import { TestBed } from '@angular/core/testing';
import { Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import {
  InvalidEditedMessageContentError,
  InvalidMessageContentError,
  MessageAccessDeniedError,
  MessageRepositoryUnavailableError,
  type MessageChange,
  type MessageCursor,
  type ObserveChannelMessagesError,
} from '@chat-hub/application/message';
import type { ChannelId } from '@chat-hub/domain/channel';
import type {
  Message,
  MessageContent,
  MessageId,
} from '@chat-hub/domain/message';
import type { Profile, ProfileId } from '@chat-hub/domain/profile';
import { MessageApplicationService } from '@client/core/message/message-application.service';
import { ProfileApplicationService } from '@client/core/profile/profile-application.service';
import { ChannelMessagesStore } from './channel-messages.store';

const channelId = '00000000-0000-4000-8000-000000000001' as ChannelId;
const authorId = '00000000-0000-4000-8000-000000000010' as ProfileId;
const secondAuthorId = '00000000-0000-4000-8000-000000000011' as ProfileId;
const authorProfile: Profile = {
  id: authorId,
  username: 'workspace-member',
  displayName: 'Workspace Member',
  avatarUrl: null,
  status: 'active',
};
const secondAuthorProfile: Profile = {
  ...authorProfile,
  id: secondAuthorId,
  username: 'second-member',
  displayName: 'Second Member',
};

const makeDeferredPromise = <Value>() => {
  let resolve!: (value: Value | PromiseLike<Value>) => void;

  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return {
    promise,
    resolve,
  };
};

const configureStore = (
  messageApplication: Partial<MessageApplicationService>,
  listCurrentProfiles = vi.fn().mockResolvedValue(Either.right([]))
) => {
  const observeChannelMessages =
    messageApplication.observeChannelMessages ??
    vi.fn().mockReturnValue(() => undefined);

  TestBed.configureTestingModule({
    providers: [
      ChannelMessagesStore,
      {
        provide: MessageApplicationService,
        useValue: {
          ...messageApplication,
          observeChannelMessages,
        },
      },
      {
        provide: ProfileApplicationService,
        useValue: { listCurrentProfiles },
      },
    ],
  });

  return {
    store: TestBed.inject(ChannelMessagesStore),
    listCurrentProfiles,
    observeChannelMessages,
  };
};

const makeRealtimeObserver = () => {
  const subscriptions: Array<{
    readonly channelId: ChannelId;
    readonly onChange: (change: MessageChange) => void;
    readonly onError: (error: ObserveChannelMessagesError) => void;
    readonly stop: ReturnType<typeof vi.fn>;
  }> = [];
  const observeChannelMessages = vi.fn(
    (
      observedChannelId: ChannelId,
      onChange: (change: MessageChange) => void,
      onError: (error: ObserveChannelMessagesError) => void
    ) => {
      const stop = vi.fn();
      subscriptions.push({
        channelId: observedChannelId,
        onChange,
        onError,
        stop,
      });
      return stop;
    }
  );

  return {
    observeChannelMessages,
    subscriptions,
  };
};

describe('ChannelMessagesStore', () => {
  it('loads messages for the selected channel', async () => {
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [],
        nextCursor: null,
      })
    );

    const { store } = configureStore({ listChannelMessages });

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
    const applicationError = new MessageRepositoryUnavailableError({
      operation: 'read',
      cause: new Error('Provider unavailable'),
    });

    const listChannelMessages = vi
      .fn()
      .mockResolvedValue(Either.left(applicationError));

    const { store } = configureStore({ listChannelMessages });

    await store.selectChannel(channelId);

    expect(store.loadStatus()).toBe('failed');

    expect(store.messages()).toEqual([]);

    expect(store.error()).toEqual({
      tag: 'MessageRepositoryUnavailableError',
      message: 'Channel messages are currently unavailable. Please try again.',
    });
  });

  it('loads each message author profile once per page', async () => {
    const firstMessage: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'First' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };
    const secondMessage: Message = {
      ...firstMessage,
      id: '00000000-0000-4000-8000-000000000003' as MessageId,
      content: 'Second' as MessageContent,
    };
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [firstMessage, secondMessage],
        nextCursor: null,
      })
    );
    const listCurrentProfiles = vi
      .fn()
      .mockResolvedValue(Either.right([authorProfile]));
    const { store } = configureStore(
      { listChannelMessages },
      listCurrentProfiles
    );

    await store.selectChannel(channelId);

    expect(listCurrentProfiles).toHaveBeenCalledExactlyOnceWith([authorId]);
    expect(store.authorProfiles()).toEqual([authorProfile]);
    expect(store.loadStatus()).toBe('loaded');
  });

  it('keeps loaded messages when optional author enrichment fails', async () => {
    const message: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'Still readable' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [message],
        nextCursor: null,
      })
    );
    const listCurrentProfiles = vi
      .fn()
      .mockResolvedValue(Either.left(new Error('Profiles unavailable')));
    const { store } = configureStore(
      { listChannelMessages },
      listCurrentProfiles
    );

    await store.selectChannel(channelId);

    expect(store.messages()).toEqual([message]);
    expect(store.authorProfiles()).toEqual([]);
    expect(store.loadStatus()).toBe('loaded');
    expect(store.error()).toBeNull();
  });

  it('loads only previously unseen authors from an older page', async () => {
    const firstMessage: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'Newest' as MessageContent,
      createdAt: new Date('2026-07-27T09:00:00.000Z'),
      editedAt: null,
    };
    const olderKnownAuthorMessage: Message = {
      ...firstMessage,
      id: '00000000-0000-4000-8000-000000000003' as MessageId,
      content: 'Older from known author' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
    };
    const olderNewAuthorMessage: Message = {
      ...olderKnownAuthorMessage,
      id: '00000000-0000-4000-8000-000000000004' as MessageId,
      authorId: secondAuthorId,
      content: 'Older from new author' as MessageContent,
    };
    const nextCursor: MessageCursor = {
      createdAt: firstMessage.createdAt,
      messageId: firstMessage.id,
    };
    const listChannelMessages = vi
      .fn()
      .mockResolvedValueOnce(
        Either.right({
          messages: [firstMessage],
          nextCursor,
        })
      )
      .mockResolvedValueOnce(
        Either.right({
          messages: [olderKnownAuthorMessage, olderNewAuthorMessage],
          nextCursor: null,
        })
      );
    const listCurrentProfiles = vi
      .fn()
      .mockResolvedValueOnce(Either.right([authorProfile]))
      .mockResolvedValueOnce(Either.right([secondAuthorProfile]));
    const { store } = configureStore(
      { listChannelMessages },
      listCurrentProfiles
    );

    await store.selectChannel(channelId);
    await store.loadOlder();

    expect(listCurrentProfiles).toHaveBeenNthCalledWith(1, [authorId]);
    expect(listCurrentProfiles).toHaveBeenNthCalledWith(2, [secondAuthorId]);
    expect(store.authorProfiles()).toEqual([
      authorProfile,
      secondAuthorProfile,
    ]);
  });

  it('ignores author profiles returned for a previously selected channel', async () => {
    const secondChannelId = '00000000-0000-4000-8000-000000000003' as ChannelId;
    const firstMessage: Message = {
      id: '00000000-0000-4000-8000-000000000004' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'First channel' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };
    const secondMessage: Message = {
      ...firstMessage,
      id: '00000000-0000-4000-8000-000000000005' as MessageId,
      channelId: secondChannelId,
      authorId: secondAuthorId,
      content: 'Second channel' as MessageContent,
    };
    const firstProfiles =
      makeDeferredPromise<Either.Either<readonly Profile[], never>>();
    const listChannelMessages = vi
      .fn()
      .mockResolvedValueOnce(
        Either.right({
          messages: [firstMessage],
          nextCursor: null,
        })
      )
      .mockResolvedValueOnce(
        Either.right({
          messages: [secondMessage],
          nextCursor: null,
        })
      );
    const listCurrentProfiles = vi
      .fn()
      .mockReturnValueOnce(firstProfiles.promise)
      .mockResolvedValueOnce(Either.right([secondAuthorProfile]));
    const { store } = configureStore(
      { listChannelMessages },
      listCurrentProfiles
    );

    const firstSelection = store.selectChannel(channelId);
    await vi.waitFor(() => {
      expect(listCurrentProfiles).toHaveBeenCalledOnce();
    });

    await store.selectChannel(secondChannelId);

    firstProfiles.resolve(Either.right([authorProfile]));
    await firstSelection;

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondMessage]);
    expect(store.authorProfiles()).toEqual([secondAuthorProfile]);
  });

  it('creates and prepends a message in the selected channel', async () => {
    const message: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'Hello' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };

    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [],
        nextCursor: null,
      })
    );
    const createMessage = vi.fn().mockResolvedValue(Either.right(message));

    const { store } = configureStore({
      listChannelMessages,
      createMessage,
    });

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
      authorId,
      status: 'active',
      content: 'Created in the first channel' as MessageContent,
      createdAt: new Date('2026-07-29T08:00:00.000Z'),
      editedAt: null,
    };

    const secondChannelMessage: Message = {
      id: '00000000-0000-4000-8000-000000000005' as MessageId,
      channelId: secondChannelId,
      authorId,
      status: 'active',
      content: 'Message from the second channel' as MessageContent,
      createdAt: new Date('2026-07-29T09:00:00.000Z'),
      editedAt: null,
    };

    const creation = makeDeferredPromise<Either.Either<Message, never>>();

    const listChannelMessages = vi
      .fn()
      .mockResolvedValueOnce(
        Either.right({
          messages: [],
          nextCursor: null,
        })
      )
      .mockResolvedValueOnce(
        Either.right({
          messages: [secondChannelMessage],
          nextCursor: null,
        })
      );

    const createMessage = vi.fn().mockReturnValue(creation.promise);

    const { store } = configureStore({
      listChannelMessages,
      createMessage,
    });

    await store.selectChannel(channelId);

    const creationResult = store.send('Created in the first channel');

    expect(store.sendMessageStatus()).toBe('sending');

    await store.selectChannel(secondChannelId);

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondChannelMessage]);
    expect(store.sendMessageStatus()).toBe('idle');

    creation.resolve(Either.right(createdMessage));

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
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [],
        nextCursor: null,
      })
    );
    const createMessage = vi.fn().mockResolvedValue(
      Either.left(
        new InvalidMessageContentError({
          cause: new Error('Blank content'),
        })
      )
    );

    const { store } = configureStore({
      listChannelMessages,
      createMessage,
    });

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
      authorId,
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
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [message],
        nextCursor: null,
      })
    );
    const editMessage = vi.fn().mockResolvedValue(Either.right(editedMessage));

    const { store } = configureStore({
      listChannelMessages,
      editMessage,
    });
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
      authorId,
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
      authorId,
      status: 'active',
      content: 'Message from the second channel' as MessageContent,
      createdAt: new Date('2026-07-29T09:00:00.000Z'),
      editedAt: null,
    };

    const edit = makeDeferredPromise<Either.Either<Message, never>>();

    const listChannelMessages = vi
      .fn()
      .mockResolvedValueOnce(
        Either.right({
          messages: [originalMessage],
          nextCursor: null,
        })
      )
      .mockResolvedValueOnce(
        Either.right({
          messages: [secondChannelMessage],
          nextCursor: null,
        })
      );

    const editMessage = vi.fn().mockReturnValue(edit.promise);

    const { store } = configureStore({
      listChannelMessages,
      editMessage,
    });

    await store.selectChannel(channelId);

    const editResult = store.edit(originalMessage.id, 'After');

    expect(store.editMessageStatus()).toBe('editing');

    await store.selectChannel(secondChannelId);

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondChannelMessage]);
    expect(store.editMessageStatus()).toBe('idle');

    edit.resolve(Either.right(editedMessage));

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
      authorId,
      status: 'active',
      content: 'Before' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [message],
        nextCursor: null,
      })
    );
    const editMessage = vi.fn().mockResolvedValue(
      Either.left(
        new InvalidEditedMessageContentError({
          cause: new Error('Blank content'),
        })
      )
    );

    const { store } = configureStore({
      listChannelMessages,
      editMessage,
    });
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
      authorId,
      status: 'active',
      content: 'Delete me' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };

    const deletedMessage: Message = {
      id: message.id,
      channelId,
      authorId,
      status: 'deleted',
      content: null,
      createdAt: message.createdAt,
      editedAt: null,
      deletedAt: new Date('2026-07-29T08:00:00.000Z'),
    };

    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [message],
        nextCursor: null,
      })
    );

    const deleteMessage = vi
      .fn()
      .mockResolvedValue(Either.right(deletedMessage));

    const { store } = configureStore({
      listChannelMessages,
      deleteMessage,
    });

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
      authorId,
      status: 'active',
      content: 'Delete me' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };

    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [message],
        nextCursor: null,
      })
    );

    const deleteMessage = vi.fn().mockResolvedValue(
      Either.left(
        new MessageAccessDeniedError({
          operation: 'delete',
        })
      )
    );

    const { store } = configureStore({
      listChannelMessages,
      deleteMessage,
    });

    await store.selectChannel(channelId);

    await expect(store.delete(message.id)).resolves.toBe(false);

    expect(store.loadStatus()).toBe('loaded');
    expect(store.sendMessageStatus()).toBe('idle');
    expect(store.editMessageStatus()).toBe('idle');
    expect(store.deleteMessageStatus()).toBe('failed');

    expect(store.deleteError()).toEqual({
      tag: 'MessageAccessDeniedError',
      message: 'You do not have permission to perform this message action.',
    });

    expect(store.messages()).toEqual([message]);
  });

  it('ignores a deletion result after another channel is selected', async () => {
    const deletion = makeDeferredPromise<Either.Either<Message, never>>();

    const secondChannelId = '00000000-0000-4000-8000-000000000003' as ChannelId;

    const message: Message = {
      id: '00000000-0000-4000-8000-000000000002' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'Delete me' as MessageContent,
      createdAt: new Date('2026-07-27T08:00:00.000Z'),
      editedAt: null,
    };

    const deletedMessage: Message = {
      id: message.id,
      channelId,
      authorId,
      status: 'deleted',
      content: null,
      createdAt: message.createdAt,
      editedAt: null,
      deletedAt: new Date('2026-07-29T08:00:00.000Z'),
    };

    const secondChannelMessage: Message = {
      id: '00000000-0000-4000-8000-000000000005' as MessageId,
      channelId: secondChannelId,
      authorId,
      status: 'active',
      content: 'Message from the second channel' as MessageContent,
      createdAt: new Date('2026-07-29T09:00:00.000Z'),
      editedAt: null,
    };

    const listChannelMessages = vi
      .fn()
      .mockResolvedValueOnce(
        Either.right({
          messages: [message],
          nextCursor: null,
        })
      )
      .mockResolvedValueOnce(
        Either.right({
          messages: [secondChannelMessage],
          nextCursor: null,
        })
      );

    const deleteMessage = vi.fn().mockReturnValue(deletion.promise);

    const { store } = configureStore({
      listChannelMessages,
      deleteMessage,
    });

    await store.selectChannel(channelId);

    const deletionResult = store.delete(message.id);

    expect(store.deleteMessageStatus()).toBe('deleting');

    await store.selectChannel(secondChannelId);

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([secondChannelMessage]);
    expect(store.deleteMessageStatus()).toBe('idle');

    deletion.resolve(Either.right(deletedMessage));

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

describe('ChannelMessagesStore realtime synchronization', () => {
  it('starts observation without waiting for optional author enrichment', async () => {
    const observer = makeRealtimeObserver();
    const initialMessage: Message = {
      id: '00000000-0000-4000-8000-000000000019' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'Initial message' as MessageContent,
      createdAt: new Date('2026-07-31T07:00:00.000Z'),
      editedAt: null,
    };
    const profileResult =
      makeDeferredPromise<Either.Either<readonly Profile[], never>>();
    const { store } = configureStore(
      {
        listChannelMessages: vi.fn().mockResolvedValue(
          Either.right({
            messages: [initialMessage],
            nextCursor: null,
          })
        ),
        observeChannelMessages: observer.observeChannelMessages,
      },
      vi.fn().mockReturnValue(profileResult.promise)
    );

    const selection = store.selectChannel(channelId);

    await vi.waitFor(() => {
      expect(observer.observeChannelMessages).toHaveBeenCalledOnce();
    });
    expect(store.loadStatus()).toBe('loaded');

    profileResult.resolve(Either.right([authorProfile]));
    await selection;
  });

  it('starts after initial loading and prepends a created message with its author profile', async () => {
    const observer = makeRealtimeObserver();
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [],
        nextCursor: null,
      })
    );
    const listCurrentProfiles = vi
      .fn()
      .mockResolvedValue(Either.right([secondAuthorProfile]));
    const { store } = configureStore(
      {
        listChannelMessages,
        observeChannelMessages: observer.observeChannelMessages,
      },
      listCurrentProfiles
    );
    const realtimeMessage: Message = {
      id: '00000000-0000-4000-8000-000000000020' as MessageId,
      channelId,
      authorId: secondAuthorId,
      status: 'active',
      content: 'Delivered live' as MessageContent,
      createdAt: new Date('2026-07-31T08:00:00.000Z'),
      editedAt: null,
    };

    await store.selectChannel(channelId);

    expect(observer.observeChannelMessages).toHaveBeenCalledExactlyOnceWith(
      channelId,
      expect.any(Function),
      expect.any(Function)
    );
    expect(store.realtimeStatus()).toBe('observing');

    observer.subscriptions[0]?.onChange({
      kind: 'created',
      message: realtimeMessage,
    });

    expect(store.messages()).toEqual([realtimeMessage]);

    await vi.waitFor(() => {
      expect(store.authorProfiles()).toEqual([secondAuthorProfile]);
    });
    expect(listCurrentProfiles).toHaveBeenCalledExactlyOnceWith([
      secondAuthorId,
    ]);
  });

  it('replaces a loaded message when a realtime update arrives', async () => {
    const observer = makeRealtimeObserver();
    const originalMessage: Message = {
      id: '00000000-0000-4000-8000-000000000021' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'Before' as MessageContent,
      createdAt: new Date('2026-07-31T08:00:00.000Z'),
      editedAt: null,
    };
    const updatedMessage: Message = {
      ...originalMessage,
      content: 'After' as MessageContent,
      editedAt: new Date('2026-07-31T09:00:00.000Z'),
    };
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [originalMessage],
        nextCursor: null,
      })
    );
    const { store } = configureStore({
      listChannelMessages,
      observeChannelMessages: observer.observeChannelMessages,
    });

    await store.selectChannel(channelId);

    observer.subscriptions[0]?.onChange({
      kind: 'updated',
      message: updatedMessage,
    });

    expect(store.messages()).toEqual([updatedMessage]);
  });

  it('stops the previous channel and ignores its late notifications', async () => {
    const observer = makeRealtimeObserver();
    const secondChannelId = '00000000-0000-4000-8000-000000000030' as ChannelId;
    const listChannelMessages = vi
      .fn()
      .mockResolvedValueOnce(
        Either.right({
          messages: [],
          nextCursor: null,
        })
      )
      .mockResolvedValueOnce(
        Either.right({
          messages: [],
          nextCursor: null,
        })
      );
    const { store } = configureStore({
      listChannelMessages,
      observeChannelMessages: observer.observeChannelMessages,
    });
    const staleMessage: Message = {
      id: '00000000-0000-4000-8000-000000000031' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'Stale' as MessageContent,
      createdAt: new Date('2026-07-31T08:00:00.000Z'),
      editedAt: null,
    };

    await store.selectChannel(channelId);
    await store.selectChannel(secondChannelId);

    expect(observer.subscriptions[0]?.stop).toHaveBeenCalledOnce();
    expect(observer.subscriptions[1]?.channelId).toBe(secondChannelId);

    observer.subscriptions[0]?.onChange({
      kind: 'created',
      message: staleMessage,
    });

    expect(store.channelId()).toBe(secondChannelId);
    expect(store.messages()).toEqual([]);
  });

  it('keeps messages visible after failure and can retry observation', async () => {
    const observer = makeRealtimeObserver();
    const message: Message = {
      id: '00000000-0000-4000-8000-000000000040' as MessageId,
      channelId,
      authorId,
      status: 'active',
      content: 'Still visible' as MessageContent,
      createdAt: new Date('2026-07-31T08:00:00.000Z'),
      editedAt: null,
    };
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [message],
        nextCursor: null,
      })
    );
    const { store } = configureStore({
      listChannelMessages,
      observeChannelMessages: observer.observeChannelMessages,
    });

    await store.selectChannel(channelId);

    observer.subscriptions[0]?.onError(
      new MessageRepositoryUnavailableError({
        operation: 'read',
        cause: new Error('Realtime unavailable'),
      })
    );

    expect(store.messages()).toEqual([message]);
    expect(store.realtimeStatus()).toBe('failed');
    expect(store.realtimeError()).toEqual({
      tag: 'MessageRepositoryUnavailableError',
      message: 'Live message updates are unavailable. Retry to reconnect.',
    });

    store.retryRealtime();

    expect(observer.observeChannelMessages).toHaveBeenCalledTimes(2);
    expect(store.realtimeStatus()).toBe('observing');
    expect(store.realtimeError()).toBeNull();
  });

  it('stops observation when the feature injection context is destroyed', async () => {
    const observer = makeRealtimeObserver();
    const listChannelMessages = vi.fn().mockResolvedValue(
      Either.right({
        messages: [],
        nextCursor: null,
      })
    );
    const { store } = configureStore({
      listChannelMessages,
      observeChannelMessages: observer.observeChannelMessages,
    });

    await store.selectChannel(channelId);
    TestBed.resetTestingModule();

    expect(observer.subscriptions[0]?.stop).toHaveBeenCalledOnce();
  });
});
