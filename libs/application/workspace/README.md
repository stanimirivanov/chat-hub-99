# Workspace Application

`@chat-hub/application/workspace` owns the provider-independent workflow for
discovering workspaces available to the current user.

## Responsibilities

- Define the `WorkspaceRepository` outbound port.
- Define typed repository failures.
- List active, accessible workspaces through an Effect use case.

It does not know about Supabase, generated database rows, Angular, selection
state, channels, or workspace-management commands.

## Runtime flow

```text
Angular caller
  -> listAccessibleWorkspaces
  -> WorkspaceRepositoryTag
  -> infrastructure adapter supplied by a Layer
```

Testing support is private and follows the fixture/stub convention used by the
other application libraries.

## Public API

- `listAccessibleWorkspaces`
- `WorkspaceRepositoryTag` and `WorkspaceRepository`
- workspace repository error types

## Verification

```bash
pnpm nx lint workspace-application
pnpm nx run workspace-application:typecheck
pnpm nx run workspace-application:typecheck:test
pnpm nx test workspace-application
```
