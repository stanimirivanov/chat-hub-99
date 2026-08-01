import { describe, expect, it } from 'vitest';
import { makeChannelListClientStub } from './testing';
import { makeSupabaseChannelRepository } from './supabase-channel-repository';

describe('makeSupabaseChannelRepository', () => {
  it('composes the complete application repository contract', () => {
    const { client } = makeChannelListClientStub({ data: [], error: null });

    const repository = makeSupabaseChannelRepository(client);

    expect(Object.keys(repository).sort()).toEqual([
      'create',
      'listByWorkspace',
      'update',
    ]);
    expect(repository.create).toBeTypeOf('function');
    expect(repository.listByWorkspace).toBeTypeOf('function');
    expect(repository.update).toBeTypeOf('function');
  });
});
