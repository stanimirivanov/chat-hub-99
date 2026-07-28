# Message Application

`@chat-hub/application/message` coordinates message use cases and defines the ports required to execute them. It is the policy layer between the domain and external systems.

## Responsibilities

- Use cases such as creating a message and listing channel messages
- Input validation that belongs to a use-case boundary
- Pagination query and result contracts
- Typed application and repository failures
- The `MessageRepository` port and its Effect service tag

## Dependency rule

The application library depends on the message domain and Effect. It does not import Supabase, generated database types, Angular, or NgRx.

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
├── create-message/          Create-message use case and boundary errors
├── list-channel-messages/   Channel-message query use case
├── pagination/              Shared keyset-pagination contracts
├── repository/              Outbound repository port and failures
└── testing/                 Internal test fixtures and repository doubles
```

Cross-use-case contracts remain near the package root:

- `message-repository.ts`: outbound port
- `message-repository-error.ts`: failures exposed by that port
- `message-query.ts`: pagination contracts shared by callers and the port

Use cases are grouped by capability, while contracts shared across use cases remain in focused `pagination` and `repository` modules. The repository remains a single port until separate read and write dependencies become independently useful.

`MessageRepository` is an outbound application port: it describes the persistence and retrieval capabilities required by the application without selecting a concrete technology.

## Effect boundary

Use cases return `Effect` values rather than starting asynchronous work themselves. This keeps dependencies and failure types visible. The Angular boundary runs those Effects and converts them to Promises for Signal Store methods.

## Adding a use case

1. Define the smallest input contract required by the use case.
2. Validate untrusted input before calling a repository.
3. Use an existing port when it accurately represents the dependency.
4. Extend a port only when the application genuinely needs a new operation.
5. Add focused success, validation, and failure tests.
6. Export only the contracts required by downstream packages.

## Verification

```bash
pnpm nx test message-application
pnpm nx run message-application:typecheck
```
