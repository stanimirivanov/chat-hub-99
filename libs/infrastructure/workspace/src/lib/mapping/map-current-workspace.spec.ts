import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { currentWorkspaceRow } from '../testing';
import { mapCurrentWorkspace } from './map-current-workspace';

describe('mapCurrentWorkspace', () => {
  it('maps a valid current workspace row', async () => {
    const result = await Effect.runPromise(
      mapCurrentWorkspace(currentWorkspaceRow)
    );

    expect(result).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Chat Hub Development',
      slug: 'chat-hub-development',
      description: null,
    });
  });

  it('rejects a row with nullable required view data', async () => {
    const result = await Effect.runPromise(
      mapCurrentWorkspace({
        ...currentWorkspaceRow,
        workspace_id: null,
      }).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);

    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidWorkspaceDataError');
    }
  });
});
