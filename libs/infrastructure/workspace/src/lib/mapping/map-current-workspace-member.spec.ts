import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { currentWorkspaceMemberRow } from '../testing';
import { mapCurrentWorkspaceMember } from './map-current-workspace-member';

describe('mapCurrentWorkspaceMember', () => {
  it('maps a valid active membership row', async () => {
    const result = await Effect.runPromise(
      mapCurrentWorkspaceMember(currentWorkspaceMemberRow)
    );

    expect(result).toEqual({
      workspaceId: currentWorkspaceMemberRow.workspace_id,
      profileId: currentWorkspaceMemberRow.user_id,
      role: 'owner',
    });
  });

  it.each([
    ['nullable workspace identity', { workspace_id: null }],
    ['nullable profile identity', { user_id: null }],
    ['unknown role', { membership_role: 'administrator' }],
  ])('rejects %s', async (_label, invalidField) => {
    const result = await Effect.runPromise(
      mapCurrentWorkspaceMember({
        ...currentWorkspaceMemberRow,
        ...invalidField,
      }).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceMemberDataError');
    }
  });
});
