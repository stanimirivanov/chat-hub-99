import type {
  CurrentWorkspace,
  CurrentWorkspaceMembership,
} from '@chat-hub/shared/database';
import { vi } from 'vitest';
import type { SupabaseWorkspaceClient } from '../supabase-workspace-client';

interface WorkspaceQueryResult {
  readonly data: readonly CurrentWorkspace[] | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
  } | null;
}

interface WorkspaceMemberQueryResult {
  readonly data: readonly CurrentWorkspaceMembership[] | null;
  readonly error: {
    readonly code: string;
    readonly message: string;
  } | null;
}

const makeWorkspaceQueryClientStub = (result: {
  readonly data: readonly unknown[] | null;
  readonly error: { readonly code: string; readonly message: string } | null;
}) => {
  const resolved = Promise.resolve(result);
  const query = {
    then: resolved.then.bind(resolved),
    eq: vi.fn(() => query),
    limit: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
  };
  const { eq, limit, or, order } = query;
  const select = vi.fn(() => query);
  const from = vi.fn(() => ({ select }));

  const client = { from } as unknown as SupabaseWorkspaceClient;

  return { client, from, select, eq, limit, or, order };
};

export const makeWorkspaceListClientStub = (result: WorkspaceQueryResult) => {
  /*
   * This is a deliberate external test boundary: constructing the complete
   * third-party Supabase client would add no value to this focused query test.
   */
  return makeWorkspaceQueryClientStub(result);
};

export const makeWorkspaceMemberListClientStub = (
  result: WorkspaceMemberQueryResult
) => makeWorkspaceQueryClientStub(result);
