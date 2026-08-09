import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { mapChannelUnreadCount } from './map-channel-unread-count';

describe('mapChannelUnreadCount', () => {
  it('maps a valid generated row', async () => {
    await expect(
      Effect.runPromise(
        mapChannelUnreadCount({
          channel_id: '00000000-0000-4000-8000-000000000001',
          unread_count: 4,
        })
      )
    ).resolves.toMatchObject({ unreadCount: 4 });
  });

  it.each([-1, 1.5, '4', null])(
    'rejects invalid unread count %j',
    async (unreadCount) => {
      const error = await Effect.runPromise(
        mapChannelUnreadCount({
          channel_id: '00000000-0000-4000-8000-000000000001',
          unread_count: unreadCount,
        }).pipe(Effect.flip)
      );

      expect(error._tag).toBe('InvalidMessageDataError');
    }
  );
});
