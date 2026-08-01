import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticationSession } from '@chat-hub/application/authentication';
import { MessageSchema, type Message } from '@chat-hub/domain/message';
import { ProfileSchema, type Profile } from '@chat-hub/domain/profile';
import { AuthenticationStore } from '@client/features/authentication/store/authentication.store';
import { ChannelMessagesStore } from '../channel-messages.store';
import { ChannelMessageHistoryComponent } from './channel-message-history.component';

const currentUserId = '00000000-0000-4000-8000-000000000010';
const otherUserId = '00000000-0000-4000-8000-000000000011';

const makeMessage = (id: string, authorId: string, content: string): Message =>
  Schema.decodeUnknownSync(MessageSchema)({
    id,
    channelId: '00000000-0000-4000-8000-000000000020',
    authorId,
    status: 'active',
    content,
    createdAt: new Date('2026-07-31T08:00:00.000Z'),
    editedAt: null,
  });

const ownMessage = makeMessage(
  '00000000-0000-4000-8000-000000000030',
  currentUserId,
  'My message'
);
const otherMessage = makeMessage(
  '00000000-0000-4000-8000-000000000031',
  otherUserId,
  'Another message'
);
const editedAt = new Date('2026-07-31T09:15:00.000Z');
const editedMessage = Schema.decodeUnknownSync(MessageSchema)({
  ...otherMessage,
  content: 'Edited message',
  editedAt,
});
const deletedAt = new Date('2026-07-31T10:30:00.000Z');
const deletedMessage = Schema.decodeUnknownSync(MessageSchema)({
  ...otherMessage,
  status: 'deleted',
  content: null,
  deletedAt,
});
const otherProfile = Schema.decodeUnknownSync(ProfileSchema)({
  id: otherUserId,
  username: 'workspace-member',
  displayName: 'Workspace Member',
  avatarUrl: null,
  status: 'active',
});

const configureComponent = async (
  messages: readonly Message[] = [ownMessage, otherMessage],
  authorProfiles: readonly Profile[] = [],
  realtimeError: {
    readonly tag: string;
    readonly message: string;
  } | null = null,
  canModerateMessages = false
) => {
  const session = signal<AuthenticationSession | null>({
    userId: currentUserId,
    email: 'owner@chat-hub.local',
  });
  const store = {
    messages: signal(messages),
    authorProfiles: signal(authorProfiles),
    isLoading: signal(false),
    error: signal(null),
    hasMessages: signal(messages.length > 0),
    isEditing: signal(false),
    isDeleting: signal(false),
    canLoadOlder: signal(false),
    isLoadingOlder: signal(false),
    editError: signal(null),
    deleteError: signal(null),
    realtimeError: signal(realtimeError),
    refresh: vi.fn(),
    loadOlder: vi.fn(),
    edit: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
    clearEditError: vi.fn(),
    clearDeleteError: vi.fn(),
    retryRealtime: vi.fn(),
  };

  await TestBed.configureTestingModule({
    imports: [ChannelMessageHistoryComponent],
    providers: [
      {
        provide: ChannelMessagesStore,
        useValue: store,
      },
      {
        provide: AuthenticationStore,
        useValue: { session },
      },
    ],
  }).compileComponents();

  const fixture: ComponentFixture<ChannelMessageHistoryComponent> =
    TestBed.createComponent(ChannelMessageHistoryComponent);
  fixture.componentRef.setInput('canModerateMessages', canModerateMessages);
  fixture.detectChanges();

  return { fixture, session, store };
};

const findButton = (
  fixture: ComponentFixture<ChannelMessageHistoryComponent>,
  label: string
): HTMLButtonElement | undefined => {
  const buttons: NodeListOf<HTMLButtonElement> =
    fixture.nativeElement.querySelectorAll('button');

  return [...buttons].find((button) => button.textContent?.trim() === label);
};

describe('ChannelMessageHistoryComponent', () => {
  it('renders an accessible machine-readable creation time', async () => {
    const { fixture } = await configureComponent([ownMessage]);
    const time = fixture.nativeElement.querySelector('time') as HTMLTimeElement;

    expect(time.dateTime).toBe(ownMessage.createdAt.toISOString());
    expect(time.getAttribute('aria-label')).toMatch(/^Sent /);
    expect(time.textContent?.trim()).not.toBe('');
    expect(fixture.nativeElement.textContent).not.toContain('Edited');
  });

  it('renders edited metadata only when an edit timestamp exists', async () => {
    const { fixture } = await configureComponent([editedMessage]);
    const item = fixture.nativeElement.querySelector('li') as HTMLLIElement;
    const editedTime = [...item.querySelectorAll('time')].find(
      (time) => time.dateTime === editedAt.toISOString()
    );

    expect(item.textContent).toContain('Edited');
    expect(editedTime).toBeDefined();
    expect(editedTime?.getAttribute('aria-label')).toMatch(/^Edited /);
  });

  it('renders deleted state with its machine-readable deletion time', async () => {
    const { fixture } = await configureComponent([deletedMessage]);
    const item = fixture.nativeElement.querySelector('li') as HTMLLIElement;
    const deletedTime = [...item.querySelectorAll('time')].find(
      (time) => time.dateTime === deletedAt.toISOString()
    );

    expect(item.textContent).toContain('Message deleted');
    expect(deletedTime).toBeDefined();
    expect(deletedTime?.getAttribute('aria-label')).toMatch(/^Deleted /);
    expect(item.querySelector('button')).toBeNull();
  });

  it('offers mutation controls only for the current user message', async () => {
    const { fixture } = await configureComponent();
    const items: NodeListOf<HTMLLIElement> =
      fixture.nativeElement.querySelectorAll('li');

    expect(items[0].textContent).toContain('You');
    expect(items[0].textContent).toContain('Edit');
    expect(items[0].textContent).toContain('Delete');

    expect(items[1].textContent).toContain('Another user');
    expect(items[1].textContent).not.toContain('Edit');
    expect(items[1].textContent).not.toContain('Delete');
  });

  it('lets an owner delete another author message without offering edit', async () => {
    const { fixture, store } = await configureComponent(
      [otherMessage],
      [],
      null,
      true
    );
    const item = fixture.nativeElement.querySelector('li') as HTMLLIElement;

    expect(item.textContent).not.toContain('Edit');
    expect(item.textContent).toContain('Delete');

    findButton(fixture, 'Delete')?.click();
    fixture.detectChanges();
    findButton(fixture, 'Confirm')?.click();
    await fixture.whenStable();

    expect(store.delete).toHaveBeenCalledExactlyOnceWith(otherMessage.id);
  });

  it('reacts to an authoritative session identity change', async () => {
    const { fixture, session } = await configureComponent();
    session.set({
      userId: otherUserId,
      email: 'member@chat-hub.local',
    });
    fixture.detectChanges();

    const items: NodeListOf<HTMLLIElement> =
      fixture.nativeElement.querySelectorAll('li');

    expect(items[0].textContent).toContain('Another user');
    expect(items[0].textContent).not.toContain('Edit');
    expect(items[1].textContent).toContain('You');
    expect(items[1].textContent).toContain('Edit');
  });

  it('renders an RLS-visible display name for another author', async () => {
    const { fixture } = await configureComponent(
      [ownMessage, otherMessage],
      [otherProfile]
    );
    const items: NodeListOf<HTMLLIElement> =
      fixture.nativeElement.querySelectorAll('li');

    expect(items[0].textContent).toContain('You');
    expect(items[1].textContent).toContain('Workspace Member');
    expect(items[1].textContent).not.toContain('Another user');
  });

  it('keeps history visible and offers retry when live updates fail', async () => {
    const { fixture, store } = await configureComponent([ownMessage], [], {
      tag: 'MessageRepositoryUnavailableError',
      message: 'Live message updates are unavailable. Retry to reconnect.',
    });

    expect(fixture.nativeElement.textContent).toContain('My message');
    expect(fixture.nativeElement.textContent).toContain(
      'Live message updates are unavailable.'
    );

    const retryButton = findButton(fixture, 'Retry live updates');
    expect(retryButton).toBeDefined();
    retryButton?.click();

    expect(store.retryRealtime).toHaveBeenCalledOnce();
  });

  it('keeps the edit form open when saving is rejected', async () => {
    const { fixture, store } = await configureComponent([ownMessage]);
    store.edit.mockResolvedValueOnce(false);

    const editButton = findButton(fixture, 'Edit');

    expect(editButton).toBeDefined();
    editButton?.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(store.edit).toHaveBeenCalledExactlyOnceWith(
      ownMessage.id,
      ownMessage.content
    );
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('keeps delete confirmation open when deletion is rejected', async () => {
    const { fixture, store } = await configureComponent([ownMessage]);
    store.delete.mockResolvedValueOnce(false);

    const deleteButton = findButton(fixture, 'Delete');
    expect(deleteButton).toBeDefined();
    deleteButton?.click();
    fixture.detectChanges();

    const confirmButton = findButton(fixture, 'Confirm');
    expect(confirmButton).toBeDefined();
    confirmButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(store.delete).toHaveBeenCalledExactlyOnceWith(ownMessage.id);
    expect(fixture.nativeElement.textContent).toContain('Delete this message?');
    expect(findButton(fixture, 'Confirm')).toBeDefined();
  });
});
