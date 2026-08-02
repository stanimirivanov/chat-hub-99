import { vi, type Mock } from 'vitest';
import type { ChatHubSupabaseClient } from '../supabase-message-client';
import type { MessageRevisionRow } from '../mapping/message-revision-row-mapper';

interface RevisionQueryStubError {
  readonly code: string;
  readonly message: string;
  readonly details: string;
  readonly hint: string;
}

interface RevisionQueryStubResponse {
  readonly data: readonly MessageRevisionRow[] | null;
  readonly error: RevisionQueryStubError | null;
}

interface AwaitableRevisionQueryBuilder {
  readonly then: Mock<
    (resolve: (value: RevisionQueryStubResponse) => void) => void
  >;
  readonly lt: LtMock;
}

type LtMock = Mock<
  (column: string, value: number) => AwaitableRevisionQueryBuilder
>;
type LimitMock = Mock<(count: number) => AwaitableRevisionQueryBuilder>;
type OrderMock = Mock<
  (
    column: string,
    options: { readonly ascending: boolean }
  ) => { readonly limit: LimitMock }
>;
type EqMock = Mock<
  (column: string, value: string) => { readonly order: OrderMock }
>;
type SelectMock = Mock<(columns: string) => { readonly eq: EqMock }>;
type FromMock = Mock<(relation: string) => { readonly select: SelectMock }>;

/** Creates an await-compatible Supabase query double for revision pages. */
export const makeListMessageRevisionsClientStub = (
  response: RevisionQueryStubResponse
) => {
  const queryBuilder = {} as AwaitableRevisionQueryBuilder;
  const then: AwaitableRevisionQueryBuilder['then'] = vi.fn((resolve) => {
    resolve(response);
  });
  const lt: LtMock = vi.fn(() => queryBuilder);

  Object.assign(queryBuilder, { then, lt });

  const limit: LimitMock = vi.fn(() => queryBuilder);
  const order: OrderMock = vi.fn(() => ({ limit }));
  const eq: EqMock = vi.fn(() => ({ order }));
  const select: SelectMock = vi.fn(() => ({ eq }));
  const from: FromMock = vi.fn(() => ({ select }));

  return {
    client: { from } as unknown as ChatHubSupabaseClient,
    from,
    select,
    eq,
    order,
    limit,
    lt,
  };
};
