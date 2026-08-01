# Message Application

`@chat-hub/application/message` coordinates message use cases and defines the
ports required to execute them. It is the policy layer between the domain and
external systems.

## Responsibilities

- Use cases for creating, editing, deleting, listing, and observing channel
  messages
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
- `observe-channel-messages/` validates channel identity, consumes repository
  notifications, and loads authoritative current projections.
- `pagination/` contains pagination value types shared by callers and the
  repository port.
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
Message creation targets a channel rather than an existing message and is not
part of this error contract.

## Import policy

Imports communicate architectural boundaries:

- Same-folder and cross-folder internal modules use explicit relative imports.
- External packages use the library public entry point.
- Internal modules must not self-import through @chat-hub/application/message.
- Domain contracts use `@chat-hub/domain/message`.
- External consumers use only `@chat-hub/application/message`.
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
