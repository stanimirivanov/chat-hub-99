# Message Application

`@chat-hub/application/message` coordinates message use cases and defines the
ports required to execute them. It is the policy layer between the domain and
external systems.

## Responsibilities

- Use cases such as creating a message and listing channel messages
- Input validation that belongs to a use-case boundary
- Pagination query and result contracts
- Typed application and repository failures
- The `MessageRepository` port and its Effect service tag

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
├── list-channel-messages/
├── pagination/
├── repository/
└── testing/
```

Cross-use-case contracts remain near the package root:

- `create-message/` contains the create-message use case, input contract,
  validation failure, and type tests.
- `list-channel-messages/` contains the paginated channel query and its
  boundary-specific input and error types.
- `pagination/` contains pagination value types shared by callers and the
  repository port.
- `repository/` defines the outbound repository port, validated command
  contracts, and technology-independent repository failures.
- `testing/` contains private fixtures and repository doubles used only by this
  library's tests.

## Import policy

Imports communicate architectural boundaries:

- Same-folder modules use relative imports.
- Cross-folder imports inside this library use `#message-application/*`.
- Domain contracts use `@chat-hub/domain/message`.
- External consumers use only `@chat-hub/application/message`.
- Internal code must not import the library through its own public entry point.
- Infrastructure, database, Angular, NgRx, Node, and browser APIs are forbidden
  in production application sourc

## Effect boundary

Use cases return `Effect` values rather than starting asynchronous work
themselves. This keeps dependencies and failure types visible. The Angular
boundary runs those Effects and converts them to Promises for Signal Store
methods.

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
