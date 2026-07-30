import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceNavigationComponent } from './workspace-navigation.component';
import { WorkspaceNavigationStore } from './workspace-navigation.store';

describe('WorkspaceNavigationComponent', () => {
  it('loads and renders accessible workspaces', async () => {
    const store = {
      workspaces: signal([
        {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Chat Hub Development',
          slug: 'chat-hub-development',
          description: null,
        },
      ]),
      selectedWorkspaceId: signal(null),
      selectedWorkspace: signal(null),
      isLoading: signal(false),
      hasWorkspaces: signal(true),
      error: signal(null),
      load: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockReturnValue(true),
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
    }).compileComponents();

    const fixture = TestBed.createComponent(WorkspaceNavigationComponent);
    fixture.detectChanges();

    expect(store.load).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Chat Hub Development');

    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('nav button');
    button.click();

    expect(store.select).toHaveBeenCalledOnce();
  });
});
