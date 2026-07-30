import { Chunk, Effect, Stream } from 'effect';
import { describe, expect, it } from 'vitest';
import type { AuthenticationSession } from '../authentication-session';
import { makeAuthenticationServiceTestLayer } from '../testing/make-authentication-service-test-layer';
import { observeSessionChanges } from './observe-session';

describe('observeSessionChanges', () => {
  it('exposes changes from the authentication service', async () => {
    const session: AuthenticationSession = {
      userId: '00000000-0000-4000-8000-000000000001',
      email: 'owner@chat-hub.local',
    };

    const { layer } = makeAuthenticationServiceTestLayer({
      sessionChanges: Stream.make(session, null),
    });

    const result = await Effect.runPromise(
      observeSessionChanges.pipe(Stream.provideLayer(layer), Stream.runCollect)
    );

    expect(Chunk.toReadonlyArray(result)).toEqual([session, null]);
  });
});
