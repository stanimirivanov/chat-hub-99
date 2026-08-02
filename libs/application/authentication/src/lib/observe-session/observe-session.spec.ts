import { Chunk, Effect, Stream } from 'effect';
import { describe, expect, it } from 'vitest';
import {
  authenticatedSessionChange,
  makeAuthenticationServiceLayer,
  passwordRecoverySessionChange,
  signedOutSessionChange,
} from '../testing';
import { observeSessionChanges } from './observe-session';

describe('observeSessionChanges', () => {
  it('exposes changes from the authentication service', async () => {
    const layer = makeAuthenticationServiceLayer({
      sessionChanges: Stream.make(
        authenticatedSessionChange,
        passwordRecoverySessionChange,
        signedOutSessionChange
      ),
    });

    const result = await Effect.runPromise(
      observeSessionChanges.pipe(Stream.provideLayer(layer), Stream.runCollect)
    );

    expect(Chunk.toReadonlyArray(result)).toEqual([
      authenticatedSessionChange,
      passwordRecoverySessionChange,
      signedOutSessionChange,
    ]);
  });
});
