import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Schema } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ProfileSchema, type Profile } from '@chat-hub/domain/profile';
import { CurrentProfileComponent } from './current-profile.component';
import { CurrentProfileStore } from './current-profile.store';

describe('CurrentProfileComponent', () => {
  const configureComponent = async (profile: Profile | null) => {
    const store = {
      profile: signal(profile),
      isLoading: signal(false),
      error: signal(null),
      load: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [CurrentProfileComponent],
    })
      .overrideComponent(CurrentProfileComponent, {
        set: {
          providers: [
            {
              provide: CurrentProfileStore,
              useValue: store,
            },
          ],
        },
      })
      .compileComponents();

    const fixture: ComponentFixture<CurrentProfileComponent> =
      TestBed.createComponent(CurrentProfileComponent);

    fixture.componentRef.setInput(
      'userId',
      '00000000-0000-4000-8000-000000000001'
    );
    fixture.componentRef.setInput('fallbackEmail', 'owner@chat-hub.local');
    fixture.detectChanges();

    return { fixture, store };
  };

  it('loads and displays profile identity with the session email', async () => {
    const profile = Schema.decodeUnknownSync(ProfileSchema)({
      id: '00000000-0000-4000-8000-000000000001',
      username: 'owner',
      displayName: 'Workspace Owner',
      avatarUrl: null,
      status: 'active',
    });
    const { fixture, store } = await configureComponent(profile);

    expect(store.load).toHaveBeenCalledWith(profile.id);
    expect(fixture.nativeElement.textContent).toContain('Workspace Owner');
    expect(fixture.nativeElement.textContent).toContain('@owner');
    expect(fixture.nativeElement.textContent).toContain('owner@chat-hub.local');
  });

  it('keeps the session email visible while profile data is unavailable', async () => {
    const { fixture } = await configureComponent(null);

    expect(fixture.nativeElement.textContent).toContain('owner@chat-hub.local');
  });
});
