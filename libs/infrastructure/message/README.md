# Message Infrastructure

`@chat-hub/infrastructure/message` implements the application message repository
with Supabase. It is an adapter: it translates application operations into
database queries/RPC calls and translates database results back into validated
domain values.

## Responsibilities

- Hold the typed Supabase client service
- Execute message command RPCs
- Query current message projections
- Subscribe to channel-filtered message-head changes
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
├── realtime/                               Scoped Supabase change streams
├── testing/                                Internal test fixtures and client doubles
├── supabase-message-client.ts              Typed Supabase client dependency
├── supabase-message-repository.ts          Repository composition
└── supabase-message-repository.layer.ts    Effect dependency provisioning
```

Supporting mappers remain small and focused:

- `message-rpc-mapper.ts` maps domain commands to generated RPC arguments.
- `message-row-mapper.ts` validates row fields, including stable author
  identity, with domain schemas.
- `map-message-head-change.ts` validates Realtime event identity and channel
  ownership before emitting an application notification.
- `message-repository-error-mapper.ts` translates Supabase failures.
- `supabase-message-client.ts` declares the infrastructure client dependency.

`supabase-message-repository.ts` assembles the Supabase implementation of the
application's MessageRepository interface (often called a port in Ports and
Adapters Architecture). It assembles focused command and query functions into
one repository object but does not re-export those internal functions.

`src/index.ts` is the only public entry point, while internal capability barrels are private implementation conveniences.

## Edit error translation

The database `edit_message` command is the concurrency-safe authority for
detecting an edit that normalizes to the current content. PostgreSQL error code
`22023` is not unique to that rule, so the adapter requires both that code and
the command's exact stable error message before returning
`MessageContentUnchangedError`. Any other `22023` failure remains a repository
availability error with its diagnostic cause retained inside the application
boundary. Raw PostgREST errors never reach Angular.

## Realtime lifecycle

`message_heads` is the single mutable row in a message aggregate and is
published through `supabase_realtime`. The adapter listens for channel-filtered
INSERT and UPDATE events, emits only stable message identities, and lets the
application reload each authoritative `current_messages` projection through
the existing RLS-protected query.

Each Effect Stream subscription owns one Supabase Realtime channel. Interrupting
the stream removes that channel; provider closure, timeout, malformed payload,
or projection-query failure terminates the stream with the existing typed
repository error vocabulary.

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
