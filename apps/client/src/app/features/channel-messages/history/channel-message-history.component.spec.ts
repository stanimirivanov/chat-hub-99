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
const otherProfile = Schema.decodeUnknownSync(ProfileSchema)({
  id: otherUserId,
  username: 'workspace-member',
  displayName: 'Workspace Member',
  avatarUrl: null,
  status: 'active',
});

const configureComponent = async (
  messages: readonly Message[] = [ownMessage, otherMessage],
  authorProfiles: readonly Profile[] = []
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
    refresh: vi.fn(),
    loadOlder: vi.fn(),
    edit: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
    clearEditError: vi.fn(),
    clearDeleteError: vi.fn(),
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
  fixture.detectChanges();

  return { fixture, session };
};

describe('ChannelMessageHistoryComponent', () => {
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
});
