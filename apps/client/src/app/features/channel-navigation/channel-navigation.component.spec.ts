import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  type Params,
  Router,
} from '@angular/router';
import { Schema } from 'effect';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ChannelIdSchema, type Channel } from '@chat-hub/domain/channel';
import { WorkspaceIdSchema } from '@chat-hub/domain/workspace';
import { ChannelNavigationComponent } from './channel-navigation.component';
import { ChannelNavigationStore } from './channel-navigation.store';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const channelId = Schema.decodeUnknownSync(ChannelIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);
const workspaceSlug = 'chat-hub-development';
const channel: Channel = {
  id: channelId,
  workspaceId,
  name: 'General',
  slug: 'general',
  description: null,
};

const configureComponent = async ({
  queryParams,
  channels = [channel],
}: {
  readonly queryParams: Params;
  readonly channels?: readonly Channel[];
}) => {
  const queryParamMap = new BehaviorSubject(convertToParamMap(queryParams));
  const route = {
    queryParamMap: queryParamMap.asObservable(),
    snapshot: {
      queryParamMap: queryParamMap.value,
    },
  };
  const router = {
    navigate: vi.fn().mockResolvedValue(true),
  };
  const store = {
    workspaceId: signal(workspaceId),
    channels: signal(channels),
    selectedChannelId: signal(null),
    selectedChannel: signal(null),
    isLoading: signal(false),
    isCreating: signal(false),
    hasChannels: signal(channels.length > 0),
    loadStatus: signal('loaded'),
    error: signal(null),
    creationError: signal(null),
    load: vi.fn().mockResolvedValue(undefined),
    createChannel: vi.fn().mockResolvedValue(channel),
    select: vi.fn().mockReturnValue(true),
    clearSelection: vi.fn(),
    clearCreationError: vi.fn(),
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
    providers: [
      {
        provide: ActivatedRoute,
        useValue: route,
      },
      {
        provide: Router,
        useValue: router,
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ChannelNavigationComponent);
  fixture.componentRef.setInput('workspaceId', workspaceId);
  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, route, router, store };
};

describe('ChannelNavigationComponent', () => {
  it('restores route selection and writes user selection to history', async () => {
    const { fixture, route, router, store } = await configureComponent({
      queryParams: {
        workspace: workspaceSlug,
        channel: channel.slug,
      },
    });

    expect(store.load).toHaveBeenCalledExactlyOnceWith(workspaceId);
    expect(store.select).toHaveBeenCalledExactlyOnceWith(channelId);
    expect(fixture.nativeElement.textContent).toContain(channel.name);

    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('nav button');
    button.click();

    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: {
        channel: channel.slug,
      },
      queryParamsHandling: 'merge',
    });
  });

  it('removes a channel slug that is not in the selected workspace', async () => {
    const { route, router, store } = await configureComponent({
      queryParams: {
        workspace: workspaceSlug,
        channel: 'inaccessible',
      },
      channels: [],
    });

    expect(store.clearSelection).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: {
        channel: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('creates a channel and navigates to its canonical slug', async () => {
    const { fixture, route, router, store } = await configureComponent({
      queryParams: {
        workspace: workspaceSlug,
      },
    });
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    );
    const createButton = buttons.find(
      (button) => button.textContent?.trim() === 'Create channel'
    );

    createButton?.click();
    fixture.detectChanges();

    const nameInput: HTMLInputElement =
      fixture.nativeElement.querySelector('#channel-name');
    const slugInput: HTMLInputElement =
      fixture.nativeElement.querySelector('#channel-slug');
    const descriptionInput: HTMLTextAreaElement =
      fixture.nativeElement.querySelector('#channel-description');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    nameInput.value = 'General';
    slugInput.value = 'general';
    descriptionInput.value = 'Workspace discussion';
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    await fixture.whenStable();

    expect(store.createChannel).toHaveBeenCalledExactlyOnceWith({
      name: 'General',
      slug: 'general',
      description: 'Workspace discussion',
    });
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: {
        channel: channel.slug,
      },
      queryParamsHandling: 'merge',
    });
  });
});
