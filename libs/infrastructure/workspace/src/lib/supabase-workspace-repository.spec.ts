import { describe, expect, it } from 'vitest';
import { makeWorkspaceListClientStub } from './testing';
import { makeSupabaseWorkspaceRepository } from './supabase-workspace-repository';

describe('makeSupabaseWorkspaceRepository', () => {
  it('composes the complete application repository contract', () => {
    const { client } = makeWorkspaceListClientStub({
      data: [],
      error: null,
    });

    const repository = makeSupabaseWorkspaceRepository(client);

    expect(Object.keys(repository).sort()).toEqual([
      'create',
      'listAccessible',
    ]);
    expect(repository.create).toBeTypeOf('function');
    expect(repository.listAccessible).toBeTypeOf('function');
  });
});
