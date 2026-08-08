import type { CurrentProfile } from '@omoikane/shared/database';
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

interface ProfileUsernameQueryClientStub extends ProfileQueryClientStub {
  readonly ilike: (column: string, value: string) => unknown;
}

interface ProfileListQueryResult {
  readonly data: readonly CurrentProfile[] | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
  } | null;
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

export const makeProfileUsernameQueryClientStub = (
  result: ProfileQueryResult
): ProfileUsernameQueryClientStub => {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ maybeSingle }));
  const ilike = vi.fn(() => ({ eq }));
  const select = vi.fn(() => ({ ilike }));
  const from = vi.fn(() => ({ select }));

  /*
   * This deliberate external test boundary avoids constructing the complete
   * third-party client for one focused fluent query.
   */
  const client = { from } as unknown as SupabaseProfileClient;

  return { client, from, select, ilike, eq, maybeSingle };
};

export const makeProfileListClientStub = (result: ProfileListQueryResult) => {
  const resolved = Promise.resolve(result);
  const query = {
    then: resolved.then.bind(resolved),
    in: vi.fn(() => query),
  };
  const inFilter = query.in;
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));

  /*
   * This deliberate external test boundary avoids constructing the complete
   * third-party client for one focused fluent query.
   */
  const client = { from } as unknown as SupabaseProfileClient;

  return { client, from, select, inFilter };
};
