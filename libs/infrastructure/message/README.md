# Message Infrastructure

`@chat-hub/infrastructure/message` implements the application message repository
with Supabase. It is an adapter: it translates application operations into
database queries/RPC calls and translates database results back into validated
domain values.

## Responsibilities

- Hold the typed Supabase client service
- Execute message command RPCs
- Query current message projections
- Map PostgREST and thrown failures into application repository errors
- Validate database results before they cross into the application layer
- Compose operation functions into `MessageRepository`
- Provide the repository through an Effect `Layer`

## Dependency rule

```text
Application
      │
      │ uses
      ▼
MessageRepository  (port)
      ▲
      │ implements
      │
SupabaseMessageRepository
```

No Angular component or Signal Store should import this package directly. The
Angular runtime composition layer supplies it to application use cases.

## Internal package structure

```text
src/lib/
├── commands/                               Mutating Supabase RPC adapters
├── queries/                                Read operations and pagination
├── mapping/                                Database/RPC value translation
├── errors/                                 Infrastructure error translation
├── testing/                                Internal test fixtures and client doubles
├── supabase-message-client.ts              Typed Supabase client dependency
├── supabase-message-repository.ts          Repository composition
└── supabase-message-repository.layer.ts    Effect dependency provisioning
```

Supporting mappers remain small and focused:

- `message-rpc-mapper.ts` maps domain commands to generated RPC arguments.
- `message-row-mapper.ts` validates row fields, including stable author
  identity, with domain schemas.
- `message-repository-error-mapper.ts` translates Supabase failures.
- `supabase-message-client.ts` declares the infrastructure client dependency.

`supabase-message-repository.ts` assembles the Supabase implementation of the
application's MessageRepository interface (often called a port in Ports and
Adapters Architecture). It assembles focused command and query functions into
one repository object but does not re-export those internal functions.

`src/index.ts` is the only public entry point, while internal capability barrels are private implementation conveniences.

## Testing strategy

- Operation tests verify Supabase query/RPC interaction and error translation.
- Mapper tests verify validation at the infrastructure boundary.
- Layer tests verify dependency composition.
- Type tests verify that the Supabase repository satisfies the MessageRepository
  port defined by the application layer.

## Verification

```bash
pnpm nx lint message-infrastructure
pnpm nx run message-infrastructure:typecheck
pnpm nx run message-infrastructure:typecheck:test
pnpm nx test message-infrastructure
```
