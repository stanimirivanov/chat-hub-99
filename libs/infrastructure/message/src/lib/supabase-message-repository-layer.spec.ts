import { describe, expect, it, vi } from 'vitest';
import { Effect, Layer, Schema } from 'effect';
import {
  SupabaseMessageClientTag,
  type ChatHubSupabaseClient,
} from './supabase-message-client';
import { makeSupabaseMessageRepository } from './supabase-message-repository';
import { MessageRepositoryTag } from '@chat-hub/application/message';
import { DeleteMessageCommandSchema } from '@chat-hub/domain/message';
import { SupabaseMessageRepositoryLayer } from './supabase-message-repository.layer';

describe('makeSupabaseMessageRepository', () => {
  it('constructs the complete repository contract', () => {
    const client = {
      from: vi.fn(),
      rpc: vi.fn(),
    } as unknown as ChatHubSupabaseClient;

    const repository = makeSupabaseMessageRepository(client);

    expect(repository.create).toBeTypeOf('function');

    expect(repository.edit).toBeTypeOf('function');

    expect(repository.delete).toBeTypeOf('function');

    expect(repository.findById).toBeTypeOf('function');

    expect(repository.listByChannel).toBeTypeOf('function');
  });
});

describe('SupabaseMessageRepositoryLayer', () => {
  it('provides MessageRepository from the Supabase client', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const client = {
      rpc,
    } as unknown as ChatHubSupabaseClient;

    const clientLayer = Layer.succeed(SupabaseMessageClientTag, client);

    const repositoryLayer = SupabaseMessageRepositoryLayer.pipe(
      Layer.provide(clientLayer)
    );

    const command = Schema.decodeUnknownSync(DeleteMessageCommandSchema)({
      messageId: '00000000-0000-4000-8000-000000000030',
    });

    const program = Effect.gen(function* () {
      const repository = yield* MessageRepositoryTag;

      yield* repository.delete(command);
    });

    await Effect.runPromise(program.pipe(Effect.provide(repositoryLayer)));

    expect(rpc).toHaveBeenCalledWith('delete_message', {
      p_message_id: command.messageId,
    });
  });
});
