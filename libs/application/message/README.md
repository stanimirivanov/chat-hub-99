# Message Application

`@omoikane/application/message` coordinates message use cases and defines the
ports required to execute them. It is the policy layer between the domain and
external systems.

## Responsibilities

- Use cases for creating, editing, deleting, listing, observing, inspecting,
  searching, and tracking channel read state
- Input validation that belongs to a use-case boundary
- Pagination query and result contracts
- Typed application and repository failures
- The `MessageRepository` port, including its scoped change stream, and its
  Effect service tag

## Dependency rule

The application library depends on the message domain and Effect. It does not
import Supabase, generated database types, Angular, or NgRx.

```text
domain/message
      ↑
application/message  <── implemented by ── infrastructure/message
      ↑
Angular application service and feature stores
```

## Package structure

Use cases are grouped by capability:

```text
src/lib/
├── create-message/
├── delete-message/
├── edit-message/
├── list-channel-messages/
├── list-message-revisions/
├── observe-channel-messages/
├── pagination/
├── repository/
└── testing/
```

Cross-use-case contracts remain near the package root:

- `create-message/` contains the create-message use case, input contract,
  validation failure, and type tests.
- `list-channel-messages/` contains the paginated channel query and its
  boundary-specific input and error types.
- `list-message-revisions/` validates revision page size and delegates the
  newest-first keyset query through the existing message repository port.
- `observe-channel-messages/` validates channel identity, consumes repository
  notifications, and loads authoritative current projections.
- `search-workspace-messages/` normalizes browser text and returns the
  repository's fixed-cap, relevance-ranked matches with active-channel route
  identities. It deliberately does not define a generic search abstraction.
- `get-channel-message/` resolves an exact RLS-visible search target and checks
  its selected-channel ownership without iterating message-history pages.
- `list-workspace-channel-unread-counts/` returns the authenticated member's
  database-authoritative snapshot for active channels in one workspace.
- `mark-channel-read/` advances one selected channel through the repository;
  the database owns monotonicity and the exact message-ordering position.
- `pagination/` contains pagination value types shared by callers and the
  repository port. Channel pages use the compound creation-time/message-ID
  cursor, while revision pages use the message-local monotonic version number.
- `repository/` defines the outbound repository port, validated command
  contracts, and technology-independent repository failures.
- `testing/` contains private fixtures and repository doubles used only by this
  library's tests.

## Command outcome ownership

Message content is normalized by the domain contract before an edit reaches the
repository. Whether that normalized value still differs from the current
message is decided by the authoritative repository operation, not by Angular.
This avoids a stale client-side comparison when another edit completes
concurrently. A no-op edit is exposed as `MessageContentUnchangedError`, an
edit-specific application failure carrying only the stable message identity.
It is deliberately absent from the create, delete, and read port contracts.

Editing and deleting can also lose a race with workspace/channel archival or
message deletion. These repository-authoritative precondition failures become
`MessageMutationNotAllowedError`, carrying the stable message identity and the
attempted `edit` or `delete` operation. The application intentionally does not
expose which parent lifecycle caused the rejection: callers need the same safe
response in each case, and infrastructure diagnostics remain behind the port.
Message creation targets a channel rather than an existing message, so its
corresponding archived-parent outcome is the separate
`MessageCreationNotAllowedError`. That error carries the requested channel
identity and is present only in the create operation's failure contract.

## Read-position ownership

The application exposes only two capability-specific operations: load a
workspace unread snapshot and mark one channel read. It does not expose the
storage row or an arbitrary ordering cursor. The presentation supplies the
stable identity of the newest message it actually loaded; persistence verifies
channel ownership and guarantees that concurrent commands cannot move a
member's position backwards.

The initial slice deliberately has snapshot semantics. Realtime unread
reconciliation remains a separate capability so its subscription scope and
lifecycle can be designed from concrete UI behavior.

## Import policy

Imports communicate architectural boundaries:

- Same-folder and cross-folder internal modules use explicit relative imports.
- External packages use the library public entry point.
- Internal modules must not self-import through @omoikane/application/message.
- Domain contracts use `@omoikane/domain/message`.
- External consumers use only `@omoikane/application/message`.
- Internal code must not import the library through its own public entry point.
- Infrastructure, database, Angular, NgRx, Node, and browser APIs are forbidden
  in production application source code.

## Effect boundary

Commands and queries return `Effect` values, while long-lived observation
returns a scoped Effect `Stream`. This keeps dependencies, failures, and
listener lifetime visible. The Angular boundary runs Effects as Promises and
Streams as interruptible Fibers for Signal Store methods.

## Adding a use case

1. Define the smallest input contract required by the use case.
2. Validate untrusted input before calling a repository.
3. Use an existing port when it accurately represents the dependency.
4. Extend a port only when the application genuinely needs a new operation.
5. Add focused success, validation, and failure tests.
6. Export only the contracts required by downstream packages.

## Verification

```bash
pnpm nx lint message-application
pnpm nx run message-application:typecheck
pnpm nx run message-application:typecheck:test
pnpm nx test message-application
```
