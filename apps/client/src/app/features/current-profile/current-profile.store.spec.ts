import { Either, Schema } from 'effect';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { ProfileRepositoryUnavailableError } from '@chat-hub/application/profile';
import { ProfileIdSchema, type Profile } from '@chat-hub/domain/profile';
import { ProfileApplicationService } from '@client/core/profile/profile-application.service';
import { CurrentProfileStore } from './current-profile.store';

const userId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const nextUserId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '00000000-0000-4000-8000-000000000002'
);

const profile: Profile = {
  id: userId,
  username: 'owner',
  displayName: 'Workspace Owner',
  avatarUrl: null,
  status: 'active',
};

const configureStore = (
  getCurrentProfile = vi.fn().mockResolvedValue(Either.right(profile))
) => {
  TestBed.configureTestingModule({
    providers: [
      CurrentProfileStore,
      {
        provide: ProfileApplicationService,
        useValue: { getCurrentProfile },
      },
    ],
  });

  return {
    store: TestBed.inject(CurrentProfileStore),
    getCurrentProfile,
  };
};

describe('CurrentProfileStore', () => {
  it('loads each session profile once and shares an active request', async () => {
    const { store, getCurrentProfile } = configureStore();

    const firstLoad = store.load(userId);
    expect(store.load(userId)).toBe(firstLoad);
    await firstLoad;

    expect(store.profile()).toEqual(profile);
    expect(store.loadStatus()).toBe('loaded');

    await store.load(userId);
    expect(getCurrentProfile).toHaveBeenCalledOnce();
  });

  it('exposes a safe error and permits retry', async () => {
    const failure = new ProfileRepositoryUnavailableError({
      cause: new Error('Provider unavailable'),
    });
    const getCurrentProfile = vi
      .fn()
      .mockResolvedValueOnce(Either.left(failure))
      .mockResolvedValueOnce(Either.right(profile));
    const { store } = configureStore(getCurrentProfile);

    await store.load(userId);

    expect(store.loadStatus()).toBe('failed');
    expect(store.error()).toEqual({
      message: 'Profile details are currently unavailable. Please try again.',
    });

    await store.load(userId);

    expect(store.loadStatus()).toBe('loaded');
    expect(store.profile()).toEqual(profile);
  });

  it('ignores a stale result after the session identity changes', async () => {
    let resolveFirst:
      | ((result: Either.Either<Profile, never>) => void)
      | undefined;
    const firstResult = new Promise<Either.Either<Profile, never>>(
      (resolve) => {
        resolveFirst = resolve;
      }
    );
    const nextProfile: Profile = {
      ...profile,
      id: nextUserId,
      username: 'member',
      displayName: 'Workspace Member',
    };
    const getCurrentProfile = vi
      .fn()
      .mockReturnValueOnce(firstResult)
      .mockResolvedValueOnce(Either.right(nextProfile));
    const { store } = configureStore(getCurrentProfile);

    const oldLoad = store.load(userId);
    await store.load(nextUserId);
    resolveFirst?.(Either.right(profile));
    await oldLoad;

    expect(store.userId()).toBe(nextUserId);
    expect(store.profile()).toEqual(nextProfile);
  });
});
