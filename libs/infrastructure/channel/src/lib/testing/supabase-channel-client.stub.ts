import type {
  ArchiveChannelResult,
  CreateChannelResult,
  CurrentChannel,
  UpdateChannelResult,
} from '@chat-hub/shared/database';
import { vi } from 'vitest';
import type { SupabaseChannelClient } from '../supabase-channel-client';

interface ChannelQueryResult {
  readonly data: readonly CurrentChannel[] | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
  } | null;
}

interface ChannelCommandResult {
  readonly data:
    | ArchiveChannelResult
    | CreateChannelResult
    | UpdateChannelResult
    | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: string;
  } | null;
}

interface ChannelCommandClientStub {
  readonly client: SupabaseChannelClient;
  readonly rpc: (
    functionName: string,
    args: Record<string, unknown>
  ) => Promise<ChannelCommandResult>;
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

export const makeChannelCommandClientStub = (
  result: ChannelCommandResult
): ChannelCommandClientStub => {
  const rpc = vi.fn().mockResolvedValue(result);

  /*
   * This deliberate external test boundary avoids constructing the complete
   * third-party client for one focused RPC command.
   */
  const client = { rpc } as unknown as SupabaseChannelClient;

  return { client, rpc };
};
