# Message Infrastructure

`@omoikane/infrastructure/message` implements the application message repository
with Supabase. It is an adapter: it translates application operations into
database queries/RPC calls and translates database results back into validated
domain values.

## Responsibilities

- Hold the typed Supabase client service
- Execute message command RPCs
- Query current message projections
- Execute workspace-scoped current-message full-text search
- Query immutable message revisions with keyset pagination
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
- `message-revision-row-mapper.ts` validates immutable `message_versions` rows
  and converts persisted timestamps before returning domain revisions.
- `map-message-head-change.ts` validates Realtime event identity and channel
  ownership before emitting an application notification.
- `message-repository-error-mapper.ts` translates Supabase failures.
- `supabase-message-client.ts` declares the infrastructure client dependency.

`supabase-message-repository.ts` assembles the Supabase implementation of the
application's MessageRepository interface (often called a port in Ports and
Adapters Architecture). It assembles focused command and query functions into
one repository object but does not re-export those internal functions.

`src/index.ts` is the only public entry point, while internal capability barrels are private implementation conveniences.

## Command error translation

The database `edit_message` command is the concurrency-safe authority for
detecting an edit that normalizes to the current content. PostgreSQL error code
`22023` is not unique to that rule, so the adapter requires both that code and
the command's exact stable error message before returning
`MessageContentUnchangedError`. Any other `22023` failure remains a repository
availability error with its diagnostic cause retained inside the application
boundary. Raw PostgREST errors never reach Angular.

For edit and delete RPCs, PostgreSQL `55000` means the command's lifecycle
precondition no longer holds: its workspace or channel was archived, or its
message was already deleted. The adapter translates those database-specific
causes into `MessageMutationNotAllowedError` with the requested message ID and
operation. Creation uses a dedicated mapper because it targets a channel rather
than an existing message. Its `55000` archived-workspace or archived-channel
rejection becomes `MessageCreationNotAllowedError` carrying that channel ID.
Other create failures continue through the common repository translation.

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

## Revision history query

Revision pages are read directly from the immutable `message_versions` table.
They are ordered newest-first by `version_number`, which is monotonic and unique
within one message, and use `version_number < cursor` for the next older page.
The adapter requests one extra row to derive `nextCursor` without a count query.

The query does not reproduce authorization rules. Existing database RLS decides
whether the authenticated caller may see complete history; an RLS-visible empty
result is a successful empty page. Every visible row is still validated against
the domain revision schema before it crosses the repository boundary.

## Workspace message search

The search adapter calls one `SECURITY INVOKER` PostgreSQL function. Database
RLS therefore remains the authorization boundary while the function restricts
results to active messages in active channels of the requested workspace.
PostgreSQL's `simple` full-text dictionary ranks matches; creation time and the
stable message ID provide deterministic tie-breakers. The first slice returns
at most 20 matches and intentionally has no reusable pagination framework.

Each row carries the active channel name and slug required for navigation. The
adapter validates both the message projection and channel identity before the
result crosses into application code. Exact navigation then uses the existing
RLS-visible current-message lookup instead of loading historical pages until a
match happens to appear.

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
