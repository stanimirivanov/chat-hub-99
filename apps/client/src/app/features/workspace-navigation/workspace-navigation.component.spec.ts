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
import { WorkspaceIdSchema, type Workspace } from '@chat-hub/domain/workspace';
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

const configureComponent = async ({
  queryParams,
  workspaces = [workspace],
}: {
  readonly queryParams: Params;
  readonly workspaces?: readonly Workspace[];
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
    selectedWorkspaceId: signal(null),
    selectedWorkspace: signal(null),
    isLoading: signal(false),
    hasWorkspaces: signal(workspaces.length > 0),
    loadStatus: signal('loaded'),
    error: signal(null),
    load: vi.fn().mockResolvedValue(undefined),
    select: vi.fn().mockReturnValue(true),
    clearSelection: vi.fn(),
  };

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
});
