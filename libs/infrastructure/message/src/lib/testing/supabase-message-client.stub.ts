import { vi } from 'vitest';
import type { SupabaseMessageClient } from '../supabase-message-client';

interface RpcStubResponse<TData> {
  readonly data: TData;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details: string;
    readonly hint: string;
  } | null;
}

/**
 * Creates the smallest Supabase client double required by message command
 * tests.
 *
 * The cast is isolated here because Supabase's fluent client type is much
 * broader than the single `rpc` capability exercised by these tests.
 */
export const makeRpcClientStub = <TData>(
  response: RpcStubResponse<TData>
): {
  readonly client: SupabaseMessageClient;
  readonly rpc: ReturnType<typeof vi.fn>;
} => {
  const rpc = vi.fn().mockResolvedValue(response);

  return {
    client: { rpc } as unknown as SupabaseMessageClient,
    rpc,
  };
};

/**
 * Creates an RPC client double whose request rejects before Supabase returns a
 * structured PostgREST error.
 */
export const makeThrowingRpcClientStub = (
  cause: unknown
): SupabaseMessageClient => {
  const rpc = vi.fn().mockRejectedValue(cause);

  return {
    rpc,
  } as unknown as SupabaseMessageClient;
};
