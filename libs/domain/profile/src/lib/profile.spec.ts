import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { ProfileSchema } from './profile';

const decodeProfile = Schema.decodeUnknownEither(ProfileSchema);

describe('ProfileSchema', () => {
  it('accepts a current profile projection', () => {
    const result = decodeProfile({
      id: '00000000-0000-4000-8000-000000000001',
      username: 'owner',
      displayName: 'Workspace Owner',
      avatarUrl: null,
      status: 'active',
    });

    expect(result._tag).toBe('Right');
  });

  it.each([
    ['missing identity', { id: null }],
    ['blank username', { username: '   ' }],
    ['blank display name', { displayName: '   ' }],
    ['blank avatar value', { avatarUrl: '   ' }],
    ['unknown status', { status: 'unknown' }],
  ])('rejects %s', (_label, invalidField) => {
    const result = decodeProfile({
      id: '00000000-0000-4000-8000-000000000001',
      username: 'owner',
      displayName: 'Workspace Owner',
      avatarUrl: null,
      status: 'active',
      ...invalidField,
    });

    expect(result._tag).toBe('Left');
  });
});
