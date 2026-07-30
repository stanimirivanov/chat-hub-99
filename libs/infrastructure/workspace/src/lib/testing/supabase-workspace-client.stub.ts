import type { CurrentWorkspace } from '@chat-hub/shared/database';
import { vi } from 'vitest';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

interface WorkspaceQueryResult {
  readonly data: readonly CurrentWorkspace[] | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
  } | null;
}

export const makeWorkspaceListClientStub = (result: WorkspaceQueryResult) => {
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
   * This is a deliberate external test boundary: constructing the complete
   * third-party Supabase client would add no value to this focused query test.
   */
  const client = {
    from,
  } as unknown as SupabaseWorkspaceClient;

  return {
    client,
    from,
    select,
    eq,
    order,
  };
};
