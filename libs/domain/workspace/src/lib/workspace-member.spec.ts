import { Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { WorkspaceMemberSchema } from './workspace-member';

const decodeMember = Schema.decodeUnknownEither(WorkspaceMemberSchema);

describe('WorkspaceMemberSchema', () => {
  it.each(['owner', 'member'])('decodes an active %s projection', (role) => {
    const result = decodeMember({
      workspaceId: '00000000-0000-4000-8000-000000000001',
      profileId: '00000000-0000-4000-8000-000000000002',
      role,
    });

    expect(Either.isRight(result)).toBe(true);
  });

  it.each([
    ['workspace identity', { workspaceId: null }],
    ['profile identity', { profileId: 'not-a-uuid' }],
    ['membership role', { role: 'administrator' }],
  ])('rejects an invalid %s', (_label, invalidField) => {
    const result = decodeMember({
      workspaceId: '00000000-0000-4000-8000-000000000001',
      profileId: '00000000-0000-4000-8000-000000000002',
      role: 'member',
      ...invalidField,
    });

    expect(Either.isLeft(result)).toBe(true);
  });
});
