import type { UpdateMyProfileResult } from '@omoikane/shared/database';
import { vi } from 'vitest';
import type { SupabaseProfileClient } from '../supabase-profile-client';

interface ProfileCommandResult {
  readonly data: UpdateMyProfileResult | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: string;
  } | null;
}

interface ProfileCommandClientStub {
  readonly client: SupabaseProfileClient;
  readonly rpc: (
    functionName: string,
    args: Record<string, unknown>
  ) => Promise<ProfileCommandResult>;
}

export const makeProfileCommandClientStub = (
  result: ProfileCommandResult
): ProfileCommandClientStub => {
  const rpc = vi.fn().mockResolvedValue(result);

  /*
   * This deliberate external test boundary avoids constructing the complete
   * third-party client for one focused RPC command.
   */
  const client = { rpc } as unknown as SupabaseProfileClient;

  return { client, rpc };
};
