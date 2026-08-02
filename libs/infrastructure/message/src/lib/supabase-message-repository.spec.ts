import { describe, expect, it } from 'vitest';

import type { ChatHubSupabaseClient } from './supabase-message-client';
import { makeSupabaseMessageRepository } from './supabase-message-repository';

describe('makeSupabaseMessageRepository', () => {
  it('provides every operation required by MessageRepository', () => {
    const repository = makeSupabaseMessageRepository(
      {} as ChatHubSupabaseClient
    );

    expect(repository).toEqual({
      create: expect.any(Function),
      edit: expect.any(Function),
      delete: expect.any(Function),
      findById: expect.any(Function),
      listByChannel: expect.any(Function),
      listRevisions: expect.any(Function),
      changesByChannel: expect.any(Function),
    });
  });
});
