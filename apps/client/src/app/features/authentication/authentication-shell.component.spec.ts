import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Either } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticationSession } from '@chat-hub/application/authentication';
import { AuthenticationStore } from './store/authentication.store';
import { AuthenticationShellComponent } from './authentication-shell.component';
import { WorkspaceApplicationService } from '@client/core/workspace/workspace-application.service';

describe('AuthenticationShellComponent', () => {
  const configureComponent = async (
    options: {
      readonly initializing?: boolean;
      readonly authenticated?: boolean;
      readonly session?: AuthenticationSession | null;
    } = {}
  ) => {
    const store = {
      isInitializing: signal(options.initializing ?? false),

      isAuthenticated: signal(options.authenticated ?? false),

      isSigningIn: signal(false),

      isSigningOut: signal(false),

      session: signal(options.session ?? null),

      error: signal(null),

      initialize: vi.fn().mockResolvedValue(undefined),

      signIn: vi.fn().mockResolvedValue(true),

      signOut: vi.fn().mockResolvedValue(true),

      clearError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AuthenticationShellComponent],

      providers: [
        provideRouter([]),
        {
          provide: AuthenticationStore,
          useValue: store,
        },
        {
          provide: WorkspaceApplicationService,
          useValue: {
            listAccessibleWorkspaces: vi
              .fn()
              .mockResolvedValue(Either.right([])),
          },
        },
      ],
    }).compileComponents();

    const fixture: ComponentFixture<AuthenticationShellComponent> =
      TestBed.createComponent(AuthenticationShellComponent);

    fixture.detectChanges();

    return {
      fixture,
      store,
    };
  };

  it('initializes authentication once when created', async () => {
    const { store } = await configureComponent({
      initializing: true,
    });

    expect(store.initialize).toHaveBeenCalledOnce();
  });

  it('renders the restored session email', async () => {
    const { fixture } = await configureComponent({
      authenticated: true,

      session: {
        userId: '00000000-0000-4000-8000-000000000001',

        email: 'owner@chat-hub.local',
      },
    });

    expect(fixture.nativeElement.textContent).toContain('owner@chat-hub.local');
  });

  it('renders sign-in content for an anonymous user', async () => {
    const { fixture } = await configureComponent({
      initializing: false,
      authenticated: false,
    });

    expect(fixture.nativeElement.textContent).toContain(
      'Sign in to Chat Hub 99'
    );
  });
});
