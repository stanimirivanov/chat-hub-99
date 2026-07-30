import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ChannelIdSchema } from '@chat-hub/domain/channel';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import { ChannelNavigationComponent } from './channel-navigation.component';
import { ChannelNavigationStore } from './channel-navigation.store';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);

describe('ChannelNavigationComponent', () => {
  it('loads and renders channels for the supplied workspace', async () => {
    const store = {
      channels: signal([
        {
          id: channelId,
          workspaceId,
          name: 'General',
          slug: 'general',
          description: null,
        },
      ]),
      selectedChannelId: signal(null),
      selectedChannel: signal(null),
      isLoading: signal(false),
      hasChannels: signal(true),
      error: signal(null),
      load: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockReturnValue(true),
    };

    TestBed.overrideComponent(ChannelNavigationComponent, {
      set: {
        providers: [
          {
            provide: ChannelNavigationStore,
            useValue: store,
          },
        ],
      },
    });

    await TestBed.configureTestingModule({
      imports: [ChannelNavigationComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ChannelNavigationComponent);
    fixture.componentRef.setInput('workspaceId', workspaceId);
    fixture.detectChanges();

    expect(store.load).toHaveBeenCalledExactlyOnceWith(workspaceId);
    expect(fixture.nativeElement.textContent).toContain('General');

    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('nav button');
    button.click();

    expect(store.select).toHaveBeenCalledExactlyOnceWith(channelId);
  });
});
