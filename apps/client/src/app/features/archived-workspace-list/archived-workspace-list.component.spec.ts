import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ArchivedWorkspaceSchema } from '@chat-hub/domain/workspace';
import { ArchivedWorkspaceListComponent } from './archived-workspace-list.component';
import { ArchivedWorkspaceListStore } from './archived-workspace-list.store';

describe('ArchivedWorkspaceListComponent', () => {
  it('renders read-only archive history with a machine-readable timestamp', async () => {
    const workspace = Schema.decodeUnknownSync(ArchivedWorkspaceSchema)({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Archived Chat Hub',
      slug: 'archived-chat-hub',
      description: 'Preserved history',
      archivedAt: '2026-08-08T09:00:00.000Z',
    });
    const store = {
      workspaces: signal([workspace]),
      isLoading: signal(false),
      hasWorkspaces: signal(true),
      error: signal(null),
      load: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.overrideComponent(ArchivedWorkspaceListComponent, {
      set: {
        providers: [{ provide: ArchivedWorkspaceListStore, useValue: store }],
      },
    });
    await TestBed.configureTestingModule({
      imports: [ArchivedWorkspaceListComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ArchivedWorkspaceListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Archived Chat Hub');
    expect(fixture.nativeElement.querySelector('time').dateTime).toBe(
      '2026-08-08T09:00:00.000Z'
    );
    expect(fixture.nativeElement.querySelectorAll('button')).toHaveLength(0);
    expect(store.load).toHaveBeenCalledOnce();
  });
});
