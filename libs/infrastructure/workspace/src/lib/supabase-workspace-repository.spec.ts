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
      'addMember',
      'changeMemberRole',
      'create',
      'listAccessible',
      'listActiveMembers',
      'removeMember',
      'update',
    ]);
    expect(repository.addMember).toBeTypeOf('function');
    expect(repository.create).toBeTypeOf('function');
    expect(repository.changeMemberRole).toBeTypeOf('function');
    expect(repository.removeMember).toBeTypeOf('function');
    expect(repository.update).toBeTypeOf('function');
    expect(repository.listAccessible).toBeTypeOf('function');
    expect(repository.listActiveMembers).toBeTypeOf('function');
  });
});
