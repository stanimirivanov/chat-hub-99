import { Component, input, signal } from '@angular/core';
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
import { ChannelMessagesComponent } from '@client/features/channel-messages/channel-messages.component';
import { ChannelNavigationComponent } from './channel-navigation.component';
import { ChannelNavigationStore } from './channel-navigation.store';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const nextWorkspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000003'
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

const updatedChannel: Channel = {
  ...channel,
  name: 'Product Design',
  description: 'Design collaboration',
};

@Component({
  selector: 'app-channel-messages',
  standalone: true,
  template: '',
})
class ChannelMessagesStubComponent {
  readonly channelId = input.required<typeof channel.id>();
}

const configureComponent = async ({
  queryParams,
  channels = [channel],
  selectedChannel = null,
  canManageChannels = false,
}: {
  readonly queryParams: Params;
  readonly channels?: readonly Channel[];
  readonly selectedChannel?: Channel | null;
  readonly canManageChannels?: boolean;
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
    selectedChannelId: signal(selectedChannel?.id ?? null),
    selectedChannel: signal(selectedChannel),
    isLoading: signal(false),
    isCreating: signal(false),
    isUpdating: signal(false),
    isArchiving: signal(false),
    hasChannels: signal(channels.length > 0),
    loadStatus: signal('loaded'),
    error: signal(null),
    creationError: signal(null),
    updateError: signal(null),
    archiveError: signal(null),
    load: vi.fn().mockResolvedValue(undefined),
    createChannel: vi.fn().mockResolvedValue(channel),
    updateSelectedChannel: vi.fn().mockResolvedValue(updatedChannel),
    archiveSelectedChannel: vi.fn().mockResolvedValue(channel.id),
    select: vi.fn().mockReturnValue(true),
    clearSelection: vi.fn(),
    clearCreationError: vi.fn(),
    clearUpdateError: vi.fn(),
    clearArchiveError: vi.fn(),
  };

  TestBed.overrideComponent(ChannelNavigationComponent, {
    remove: {
      imports: [ChannelMessagesComponent],
    },
    add: {
      imports: [ChannelMessagesStubComponent],
    },
  });

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
  fixture.componentRef.setInput('canManageChannels', canManageChannels);
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

  it('lets an owner edit mutable details without changing the route', async () => {
    const { fixture, router, store } = await configureComponent({
      queryParams: {
        workspace: workspaceSlug,
        channel: channel.slug,
      },
      selectedChannel: channel,
    });

    expect(fixture.nativeElement.textContent).not.toContain('Edit channel');
    fixture.componentRef.setInput('canManageChannels', true);
    fixture.detectChanges();

    const editButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Edit channel');
    editButton?.click();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector(
      '#channel-edit-name'
    ) as HTMLInputElement;
    const descriptionInput = fixture.nativeElement.querySelector(
      '#channel-edit-description'
    ) as HTMLTextAreaElement;
    const form = nameInput.closest('form') as HTMLFormElement;
    nameInput.value = updatedChannel.name;
    descriptionInput.value = updatedChannel.description ?? '';
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    await fixture.whenStable();

    expect(store.updateSelectedChannel).toHaveBeenCalledExactlyOnceWith({
      name: updatedChannel.name,
      description: updatedChannel.description,
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('requires owner confirmation before archiving and clears its route', async () => {
    const { fixture, route, router, store } = await configureComponent({
      queryParams: {
        workspace: workspaceSlug,
        channel: channel.slug,
      },
      selectedChannel: channel,
      canManageChannels: true,
    });

    const archiveButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Archive channel');
    archiveButton?.click();
    fixture.detectChanges();

    expect(store.archiveSelectedChannel).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      `Archive ${channel.name}?`
    );

    const confirmButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Confirm archive');
    confirmButton?.click();

    await fixture.whenStable();

    expect(store.archiveSelectedChannel).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: { channel: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('does not clear a same-slug channel after the workspace changes', async () => {
    let resolveArchive: ((channelId: typeof channel.id) => void) | undefined;
    const archiveResult = new Promise<typeof channel.id>((resolve) => {
      resolveArchive = resolve;
    });
    const { fixture, router, store } = await configureComponent({
      queryParams: {
        workspace: workspaceSlug,
        channel: channel.slug,
      },
      selectedChannel: channel,
      canManageChannels: true,
    });
    store.archiveSelectedChannel.mockReturnValue(archiveResult);

    const archiveButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Archive channel');
    archiveButton?.click();
    fixture.detectChanges();
    const confirmButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Confirm archive');
    confirmButton?.click();

    fixture.componentRef.setInput('workspaceId', nextWorkspaceId);
    fixture.detectChanges();
    resolveArchive?.(channel.id);
    await fixture.whenStable();

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
