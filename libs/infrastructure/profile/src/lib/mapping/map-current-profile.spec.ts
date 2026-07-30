import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { currentProfileRow } from '../testing';
import { mapCurrentProfile } from './map-current-profile';

describe('mapCurrentProfile', () => {
  it('maps a valid current profile row', async () => {
    const result = await Effect.runPromise(
      mapCurrentProfile(currentProfileRow)
    );

    expect(result).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      username: 'owner',
      displayName: 'Workspace Owner',
      avatarUrl: null,
      status: 'active',
    });
  });

  it('rejects nullable required view data', async () => {
    const result = await Effect.runPromise(
      mapCurrentProfile({
        ...currentProfileRow,
        display_name: null,
      }).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidProfileDataError');
    }
  });
});
