import type { CurrentMessage } from '@chat-hub/shared/database';
import { vi, type Mock } from 'vitest';

import type { ChatHubSupabaseClient } from '../supabase-message-client';

interface StubError {
  readonly code: string;
  readonly message: string;
  readonly details: string;
  readonly hint: string;
}

interface StubResponse {
  readonly data: CurrentMessage | null;
  readonly error: StubError | null;
}

type MaybeSingleMock = Mock<() => Promise<StubResponse>>;

type EqMock = Mock<
  (
    column: string,
    value: string
  ) => {
    readonly maybeSingle: MaybeSingleMock;
  }
>;

type SelectMock = Mock<
  (columns: string) => {
    readonly eq: EqMock;
  }
>;

type FromMock = Mock<
  (relation: string) => {
    readonly select: SelectMock;
  }
>;

interface FindMessageClientStub {
  readonly client: ChatHubSupabaseClient;
  readonly from: FromMock;
  readonly select: SelectMock;
  readonly eq: EqMock;
  readonly maybeSingle: MaybeSingleMock;
}

/**
 * Creates a Supabase fluent-query double for `findMessageById` tests.
 *
 * The double exposes each stage of the query chain so tests can verify the
 * selected relation, projection, predicate, and terminal operation without
 * depending on a live Supabase instance.
 */
export const makeFindMessageClientStub = (
  response: StubResponse
): FindMessageClientStub => {
  const maybeSingle: MaybeSingleMock = vi.fn().mockResolvedValue(response);

  const eq: EqMock = vi.fn(() => ({
    maybeSingle,
  }));

  const select: SelectMock = vi.fn(() => ({
    eq,
  }));

  const from: FromMock = vi.fn(() => ({
    select,
  }));

  return {
    client: {
      from,
    } as unknown as ChatHubSupabaseClient,
    from,
    select,
    eq,
    maybeSingle,
  };
};
