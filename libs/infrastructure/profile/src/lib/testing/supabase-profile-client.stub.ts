import type { CurrentProfile } from '@chat-hub/shared/database';
import { vi } from 'vitest';
import type { SupabaseProfileClient } from '../supabase-profile-client';

interface ProfileQueryResult {
  readonly data: CurrentProfile | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
  } | null;
}

interface ProfileQueryClientStub {
  readonly client: SupabaseProfileClient;
  readonly from: (relation: string) => unknown;
  readonly select: (columns: string) => unknown;
  readonly eq: (column: string, value: string) => unknown;
  readonly maybeSingle: () => Promise<ProfileQueryResult>;
}

export const makeProfileQueryClientStub = (
  result: ProfileQueryResult
): ProfileQueryClientStub => {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  /*
   * This deliberate external test boundary avoids constructing the complete
   * third-party client for one focused fluent query.
   */
  const client = { from } as unknown as SupabaseProfileClient;

  return { client, from, select, eq, maybeSingle };
};
