import { Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { mapWorkspacePresenceState } from './map-workspace-presence-state';

describe('mapWorkspacePresenceState', () => {
  it('returns sorted distinct valid provider presence keys', () => {
    const first = '10000000-0000-4000-8000-000000000002';
    const second = '10000000-0000-4000-8000-000000000001';

    expect(
      mapWorkspacePresenceState({
        [first]: [{ online_at: '2026-08-08T12:00:00.000Z' }],
        [second]: [{ online_at: '2026-08-08T12:00:00.000Z' }],
        invalid: [{}],
      })
    ).toEqual(Either.right([second, first]));
  });

  it('rejects a malformed provider state container', () => {
    const result = mapWorkspacePresenceState(null);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('WorkspacePresenceUnavailableError');
    }
  });
});
