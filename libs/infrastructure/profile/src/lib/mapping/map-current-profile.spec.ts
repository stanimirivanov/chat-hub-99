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

  it('maps a validated HTTPS avatar URL', async () => {
    const result = await Effect.runPromise(
      mapCurrentProfile({
        ...currentProfileRow,
        avatar_url: 'https://example.com/avatar.png',
      })
    );

    expect(result.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('rejects an unsupported persisted avatar URL', async () => {
    const result = await Effect.runPromise(
      mapCurrentProfile({
        ...currentProfileRow,
        avatar_url: 'http://example.com/avatar.png',
      }).pipe(Effect.either)
    );

    expect(result).toMatchObject({
      _tag: 'Left',
      left: { _tag: 'InvalidProfileDataError' },
    });
  });
});
