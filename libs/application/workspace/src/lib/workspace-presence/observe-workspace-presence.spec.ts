import { Chunk, Effect, Either, Schema, Stream } from 'effect';
import { describe, expect, it, vi } from 'vitest';
import { ProfileIdSchema } from '@omoikane/domain/profile';
import { WorkspaceIdSchema } from '@omoikane/domain/workspace';
import { makeWorkspacePresenceServiceLayer } from '../testing';
import { observeWorkspacePresence } from './observe-workspace-presence';

const workspaceId = Schema.decodeUnknownSync(WorkspaceIdSchema)(
  '00000000-0000-4000-8000-000000000001'
);
const profileId = Schema.decodeUnknownSync(ProfileIdSchema)(
  '10000000-0000-4000-8000-000000000001'
);

describe('observeWorkspacePresence', () => {
  it('validates the workspace and delegates observation', async () => {
    const observe = vi.fn(() => Stream.make([profileId]));

    const snapshots = await Effect.runPromise(
      observeWorkspacePresence({ workspaceId }).pipe(
        Stream.provideLayer(makeWorkspacePresenceServiceLayer({ observe })),
        Stream.runCollect
      )
    );

    expect(Chunk.toReadonlyArray(snapshots)).toEqual([[profileId]]);
    expect(observe).toHaveBeenCalledExactlyOnceWith(workspaceId);
  });

  it.each([undefined, null, {}, { workspaceId: null }, { workspaceId: '' }])(
    'rejects an invalid request before accessing the service: %j',
    async (input) => {
      const observe = vi.fn(() => Stream.make([profileId]));

      const result = await Effect.runPromise(
        observeWorkspacePresence(input).pipe(
          Stream.provideLayer(makeWorkspacePresenceServiceLayer({ observe })),
          Stream.runCollect,
          Effect.either
        )
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toMatchObject({
          _tag: 'InvalidWorkspacePresenceInputError',
          field: 'workspaceId',
        });
      }
      expect(observe).not.toHaveBeenCalled();
    }
  );
});
