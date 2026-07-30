import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { AuthenticationServiceTag } from '@chat-hub/application/authentication';
import { ChannelRepositoryTag } from '@chat-hub/application/channel';
import { MessageRepositoryTag } from '@chat-hub/application/message';
import { WorkspaceRepositoryTag } from '@chat-hub/application/workspace';
import { makeApplicationInfrastructureLayer } from './application-infrastructure.layer';

describe('makeApplicationInfrastructureLayer', () => {
  it('provides application services without remaining requirements', async () => {
    const layer = makeApplicationInfrastructureLayer({
      url: 'http://127.0.0.1:54321',
      publishableKey: 'test-publishable-key',
    });

    const program = Effect.gen(function* () {
      const messageRepository = yield* MessageRepositoryTag;
      const authenticationService = yield* AuthenticationServiceTag;
      const channelRepository = yield* ChannelRepositoryTag;
      const workspaceRepository = yield* WorkspaceRepositoryTag;

      return {
        messageRepository,
        authenticationService,
        channelRepository,
        workspaceRepository,
      };
    });

    const repository = await Effect.runPromise(
      program.pipe(Effect.provide(layer))
    );

    expect(repository.messageRepository.create).toBeTypeOf('function');

    expect(repository.messageRepository.edit).toBeTypeOf('function');

    expect(repository.messageRepository.delete).toBeTypeOf('function');

    expect(repository.messageRepository.findById).toBeTypeOf('function');

    expect(repository.messageRepository.listByChannel).toBeTypeOf('function');

    expect(repository.authenticationService.signIn).toBeTypeOf('function');

    expect(repository.authenticationService.signOut).toBeTypeOf('function');

    expect(repository.channelRepository.listByWorkspace).toBeTypeOf('function');

    expect(repository.workspaceRepository.listAccessible).toBeTypeOf(
      'function'
    );
  });
});
