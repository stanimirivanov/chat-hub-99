import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { WorkspacePresenceComponent } from './workspace-presence.component';
import { WorkspacePresenceStore } from './workspace-presence.store';

describe('WorkspacePresenceComponent', () => {
  it('starts observation and renders a retryable online count', async () => {
    const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
      '00000000-0000-4000-8000-000000000001'
    );
    const store = {
      isConnecting: signal(false),
      onlineCount: signal(2),
      error: signal<{ readonly message: string } | null>(null),
      observe: vi.fn(),
      retry: vi.fn(),
    };

    TestBed.overrideComponent(WorkspacePresenceComponent, {
      set: {
        providers: [{ provide: WorkspacePresenceStore, useValue: store }],
      },
    });
    await TestBed.configureTestingModule({
      imports: [WorkspacePresenceComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(WorkspacePresenceComponent);
    fixture.componentRef.setInput('workspaceId', workspaceId);
    fixture.detectChanges();

    expect(store.observe).toHaveBeenCalledExactlyOnceWith(workspaceId);
    expect(fixture.nativeElement.textContent).toContain('2 members online');

    store.error.set({ message: 'Online presence is unavailable.' });
    fixture.detectChanges();
    const retry = fixture.nativeElement.querySelector(
      'button'
    ) as HTMLButtonElement;
    retry.click();

    expect(store.retry).toHaveBeenCalledOnce();
  });
});
