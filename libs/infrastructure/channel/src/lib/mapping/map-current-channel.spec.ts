import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { currentChannelRow } from '../testing';
import { mapCurrentChannel } from './map-current-channel';

describe('mapCurrentChannel', () => {
  it('maps a valid current channel row', async () => {
    const result = await Effect.runPromise(
      mapCurrentChannel(currentChannelRow)
    );

    expect(result).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      workspaceId: '00000000-0000-4000-8000-000000000002',
      name: 'General',
      slug: 'general',
      description: null,
    });
  });

  it('rejects nullable required view data', async () => {
    const result = await Effect.runPromise(
      mapCurrentChannel({
        ...currentChannelRow,
        channel_id: null,
      }).pipe(Effect.either)
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('InvalidChannelDataError');
    }
  });
});
