import type { CurrentChannel } from '@chat-hub/shared/database';
import { vi } from 'vitest';
import type { SupabaseChannelClient } from '../supabase-channel-client';

interface ChannelQueryResult {
  readonly data: readonly CurrentChannel[] | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
  } | null;
}

export const makeChannelListClientStub = (result: ChannelQueryResult) => {
  const resolved = Promise.resolve(result);
  const query = {
    then: resolved.then.bind(resolved),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
  };
  const { eq, order } = query;
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));

  /*
   * This deliberate external test boundary avoids constructing the complete
   * third-party Supabase client for one focused fluent query.
   */
  const client = { from } as unknown as SupabaseChannelClient;

  return { client, from, select, eq, order };
};
