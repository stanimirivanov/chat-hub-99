import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ActivatedRoute,
  convertToParamMap,
  type Params,
  Router,
} from '@angular/router';
import { Schema } from 'effect';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceIdSchema, type Workspace } from '@chat-hub/domain/workspace';
import { ChannelNavigationComponent } from '@client/features/channel-navigation/channel-navigation.component';
import { WorkspaceMemberDirectoryComponent } from '@client/features/workspace-member-directory/workspace-member-directory.component';
import { WorkspaceNavigationComponent } from './workspace-navigation.component';
import { WorkspaceNavigationStore } from './workspace-navigation.store';

const workspace: Workspace = {
  id: Schema.decodeUnknownSync(WorkspaceIdSchema)(
    '00000000-0000-4000-8000-000000000001'
  ),
  name: 'Chat Hub Development',
  slug: 'chat-hub-development',
  description: null,
};

const updatedWorkspace: Workspace = {
  ...workspace,
  name: 'Chat Hub Community',
  slug: 'chat-hub-community',
  description: 'Updated collaboration space',
};

@Component({
  selector: 'app-channel-navigation',
  standalone: true,
  template: '',
})
class ChannelNavigationStubComponent {
  readonly workspaceId = input.required<typeof workspace.id>();
  readonly canManageChannels = input(false);
  readonly canModerateMessages = input(false);
}

@Component({
  selector: 'app-workspace-member-directory',
  standalone: true,
  template: '',
})
class WorkspaceMemberDirectoryStubComponent {
  readonly workspaceId = input.required<typeof workspace.id>();
  readonly canManageMembersChange = output<boolean>();
}

const configureComponent = async ({
  queryParams,
  workspaces = [workspace],
  selectedWorkspace = null,
}: {
  readonly queryParams: Params;
  readonly workspaces?: readonly Workspace[];
  readonly selectedWorkspace?: Workspace | null;
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
    workspaces: signal(workspaces),
    selectedWorkspaceId: signal(selectedWorkspace?.id ?? null),
    selectedWorkspace: signal(selectedWorkspace),
    isLoading: signal(false),
    isCreating: signal(false),
    isUpdating: signal(false),
    isArchiving: signal(false),
    isLeaving: signal(false),
    hasWorkspaces: signal(workspaces.length > 0),
    loadStatus: signal('loaded'),
    error: signal(null),
    creationError: signal(null),
    updateError: signal(null),
    archiveError: signal(null),
    departureError: signal(null),
    load: vi.fn().mockResolvedValue(undefined),
    createWorkspace: vi.fn().mockResolvedValue(workspace),
    updateSelectedWorkspace: vi.fn().mockResolvedValue(updatedWorkspace),
    archiveSelectedWorkspace: vi.fn().mockResolvedValue(workspace.id),
    leaveSelectedWorkspace: vi.fn().mockResolvedValue(workspace.id),
    select: vi.fn().mockReturnValue(true),
    clearSelection: vi.fn(),
    clearCreationError: vi.fn(),
    clearUpdateError: vi.fn(),
    clearArchiveError: vi.fn(),
    clearDepartureError: vi.fn(),
  };

  TestBed.overrideComponent(WorkspaceNavigationComponent, {
    remove: {
      imports: [ChannelNavigationComponent, WorkspaceMemberDirectoryComponent],
    },
    add: {
      imports: [
        ChannelNavigationStubComponent,
        WorkspaceMemberDirectoryStubComponent,
      ],
    },
  });

  TestBed.overrideComponent(WorkspaceNavigationComponent, {
    set: {
      providers: [
        {
          provide: WorkspaceNavigationStore,
          useValue: store,
        },
      ],
    },
  });

  await TestBed.configureTestingModule({
    imports: [WorkspaceNavigationComponent],
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

  const fixture = TestBed.createComponent(WorkspaceNavigationComponent);
  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, route, router, store };
};

describe('WorkspaceNavigationComponent', () => {
  it('restores route selection and writes user selection to history', async () => {
    const { fixture, route, router, store } = await configureComponent({
      queryParams: {
        workspace: workspace.slug,
      },
    });

    expect(store.load).toHaveBeenCalledOnce();
    expect(store.select).toHaveBeenCalledExactlyOnceWith(workspace.id);
    expect(fixture.nativeElement.textContent).toContain(workspace.name);

    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('nav button');
    button.click();

    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: {
        workspace: workspace.slug,
        channel: null,
      },
      queryParamsHandling: 'merge',
    });
  });

  it('removes an inaccessible workspace slug from the URL', async () => {
    const { route, router, store } = await configureComponent({
      queryParams: {
        workspace: 'inaccessible',
        channel: 'general',
      },
      workspaces: [],
    });

    expect(store.clearSelection).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: {
        workspace: null,
        channel: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('creates a workspace and navigates to its canonical slug', async () => {
    const { fixture, route, router, store } = await configureComponent({
      queryParams: {},
    });
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    );
    const createButton = buttons.find(
      (button) => button.textContent?.trim() === 'Create workspace'
    );

    createButton?.click();
    fixture.detectChanges();

    const nameInput: HTMLInputElement =
      fixture.nativeElement.querySelector('#workspace-name');
    const slugInput: HTMLInputElement =
      fixture.nativeElement.querySelector('#workspace-slug');
    const descriptionInput: HTMLTextAreaElement =
      fixture.nativeElement.querySelector('#workspace-description');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    nameInput.value = 'Chat Hub Development';
    slugInput.value = 'chat-hub-development';
    descriptionInput.value = 'Team collaboration';
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    await fixture.whenStable();

    expect(store.createWorkspace).toHaveBeenCalledExactlyOnceWith({
      name: 'Chat Hub Development',
      slug: 'chat-hub-development',
      description: 'Team collaboration',
    });
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: {
        workspace: workspace.slug,
        channel: null,
      },
      queryParamsHandling: 'merge',
    });
  });

  it('lets an owner edit details and replaces a changed slug in the URL', async () => {
    const { fixture, route, router, store } = await configureComponent({
      queryParams: {
        workspace: workspace.slug,
        channel: 'general',
      },
      selectedWorkspace: workspace,
    });
    const directory = fixture.debugElement.query(
      By.directive(WorkspaceMemberDirectoryStubComponent)
    ).componentInstance as WorkspaceMemberDirectoryStubComponent;

    expect(fixture.nativeElement.textContent).not.toContain('Edit workspace');
    directory.canManageMembersChange.emit(true);
    fixture.detectChanges();

    const channelNavigation = fixture.debugElement.query(
      By.directive(ChannelNavigationStubComponent)
    ).componentInstance as ChannelNavigationStubComponent;
    expect(channelNavigation.canManageChannels()).toBe(true);
    expect(channelNavigation.canModerateMessages()).toBe(true);

    const editButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Edit workspace');
    editButton?.click();
    fixture.detectChanges();

    const nameInput = fixture.nativeElement.querySelector(
      '#workspace-edit-name'
    ) as HTMLInputElement;
    const slugInput = fixture.nativeElement.querySelector(
      '#workspace-edit-slug'
    ) as HTMLInputElement;
    const descriptionInput = fixture.nativeElement.querySelector(
      '#workspace-edit-description'
    ) as HTMLTextAreaElement;
    const form = nameInput.closest('form') as HTMLFormElement;
    nameInput.value = updatedWorkspace.name;
    slugInput.value = updatedWorkspace.slug;
    descriptionInput.value = updatedWorkspace.description ?? '';
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    await fixture.whenStable();

    expect(store.updateSelectedWorkspace).toHaveBeenCalledExactlyOnceWith({
      name: updatedWorkspace.name,
      slug: updatedWorkspace.slug,
      description: updatedWorkspace.description,
    });
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: { workspace: updatedWorkspace.slug },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('requires owner confirmation before archiving and clears its route', async () => {
    const { fixture, route, router, store } = await configureComponent({
      queryParams: {
        workspace: workspace.slug,
        channel: 'general',
      },
      selectedWorkspace: workspace,
    });
    const directory = fixture.debugElement.query(
      By.directive(WorkspaceMemberDirectoryStubComponent)
    ).componentInstance as WorkspaceMemberDirectoryStubComponent;

    expect(fixture.nativeElement.textContent).not.toContain(
      'Archive workspace'
    );
    directory.canManageMembersChange.emit(true);
    fixture.detectChanges();

    const archiveButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Archive workspace');
    archiveButton?.click();
    fixture.detectChanges();

    expect(store.archiveSelectedWorkspace).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      `Archive ${workspace.name}?`
    );

    const confirmButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Confirm archive');
    confirmButton?.click();

    await fixture.whenStable();

    expect(store.archiveSelectedWorkspace).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: {
        workspace: null,
        channel: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('requires member confirmation before leaving and clears its route', async () => {
    const { fixture, route, router, store } = await configureComponent({
      queryParams: {
        workspace: workspace.slug,
        channel: 'general',
      },
      selectedWorkspace: workspace,
    });

    const leaveButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Leave workspace');
    leaveButton?.click();
    fixture.detectChanges();

    expect(store.leaveSelectedWorkspace).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      `Leave ${workspace.name}?`
    );

    const confirmButton = Array.from(
      fixture.nativeElement.querySelectorAll(
        'button'
      ) as NodeListOf<HTMLButtonElement>
    ).find((button) => button.textContent?.trim() === 'Confirm leave');
    confirmButton?.click();

    await fixture.whenStable();

    expect(store.leaveSelectedWorkspace).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([], {
      relativeTo: route,
      queryParams: {
        workspace: null,
        channel: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });
});
