import type { CurrentMessage } from '@chat-hub/shared/database';
import { vi, type Mock } from 'vitest';

import type { ChatHubSupabaseClient } from '../supabase-message-client';

/**
 * Simplified PostgREST error returned by the Supabase query double.
 *
 * The fields match the error information consumed by the message repository
 * error mapper without requiring tests to construct a complete Supabase error.
 */
interface ListQueryStubError {
  readonly code: string;
  readonly message: string;
  readonly details: string;
  readonly hint: string;
}

/**
 * Result produced when the list query double is awaited.
 */
export interface ListQueryStubResponse {
  readonly data: readonly CurrentMessage[] | null;
  readonly error: ListQueryStubError | null;
}

/**
 * Await-compatible query builder returned after applying the page limit.
 *
 * Supabase query builders are Promise-like rather than native promises. The
 * repository awaits the builder, so the double provides a `then` function
 * with the minimum behavior required by the test.
 */
interface AwaitableListQueryBuilder {
  readonly then: Mock<
    (resolve: (value: ListQueryStubResponse) => void) => void
  >;

  readonly or: OrMock;
}

type OrMock = Mock<(filter: string) => AwaitableListQueryBuilder>;

type LimitMock = Mock<(count: number) => AwaitableListQueryBuilder>;

type OrderByMessageIdMock = Mock<
  (
    column: string,
    options: {
      readonly ascending: boolean;
    }
  ) => {
    readonly limit: LimitMock;
  }
>;

type OrderByCreatedAtMock = Mock<
  (
    column: string,
    options: {
      readonly ascending: boolean;
    }
  ) => {
    readonly order: OrderByMessageIdMock;
  }
>;

type EqMock = Mock<
  (
    column: string,
    value: string
  ) => {
    readonly order: OrderByCreatedAtMock;
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

/**
 * Test double returned by {@link makeListMessageClientStub}.
 *
 * Each stage of the fluent Supabase query is exposed so a specification can
 * verify both the executed query and the resulting repository behavior.
 */
export interface ListMessageClientStub {
  readonly client: ChatHubSupabaseClient;
  readonly from: FromMock;
  readonly select: SelectMock;
  readonly eq: EqMock;
  readonly orderByCreatedAt: OrderByCreatedAtMock;
  readonly orderByMessageId: OrderByMessageIdMock;
  readonly limit: LimitMock;
  readonly or: OrMock;
}

/**
 * Creates a Supabase fluent-query double for message-list tests.
 *
 * The constructed chain supports:
 *
 * `from → select → eq → order → order → limit → or`
 *
 * The final query builder is awaitable, matching the Promise-like behavior of
 * the real Supabase query builder.
 *
 * @param response - Database rows or error returned when the query is awaited.
 */
export const makeListMessageClientStub = (
  response: ListQueryStubResponse
): ListMessageClientStub => {
  const resolveResponse = (
    resolve: (value: ListQueryStubResponse) => void
  ): void => {
    resolve(response);
  };

  const queryBuilder = {} as AwaitableListQueryBuilder;

  const then: AwaitableListQueryBuilder['then'] = vi.fn(resolveResponse);

  const or: OrMock = vi.fn(() => queryBuilder);

  Object.assign(queryBuilder, {
    then,
    or,
  });

  const limit: LimitMock = vi.fn(() => queryBuilder);

  const orderByMessageId: OrderByMessageIdMock = vi.fn(() => ({
    limit,
  }));

  const orderByCreatedAt: OrderByCreatedAtMock = vi.fn(() => ({
    order: orderByMessageId,
  }));

  const eq: EqMock = vi.fn(() => ({
    order: orderByCreatedAt,
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
    orderByCreatedAt,
    orderByMessageId,
    limit,
    or,
  };
};
