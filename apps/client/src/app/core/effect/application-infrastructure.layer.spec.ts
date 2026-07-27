import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { MessageRepositoryTag } from '@chat-hub/application/message';
import { makeApplicationInfrastructureLayer } from './application-infrastructure.layer';

describe('makeApplicationInfrastructureLayer', () => {
  it('provides MessageRepository without remaining requirements', async () => {
    const layer = makeApplicationInfrastructureLayer({
      url: 'http://127.0.0.1:54321',
      publishableKey: 'test-publishable-key',
    });

    const program = Effect.gen(function* () {
      return yield* MessageRepositoryTag;
    });

    const repository = await Effect.runPromise(
      program.pipe(Effect.provide(layer))
    );

    expect(repository.create).toBeTypeOf('function');

    expect(repository.edit).toBeTypeOf('function');

    expect(repository.delete).toBeTypeOf('function');

    expect(repository.findById).toBeTypeOf('function');

    expect(repository.listByChannel).toBeTypeOf('function');
  });
});
