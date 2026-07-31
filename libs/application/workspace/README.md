# Workspace Application

`@chat-hub/application/workspace` owns provider-independent workflows for
discovering accessible workspaces and creating a workspace for the current
user.

## Responsibilities

- Define the `WorkspaceRepository` outbound port.
- Define typed read, creation, and slug-conflict failures.
- List active, accessible workspaces through an Effect use case.
- Normalize and validate workspace creation input before repository access.
- Create a workspace without accepting client-supplied owner identity.

It does not know about Supabase, generated database rows, Angular, selection
state, channels, or workspace update/archive commands.

## Runtime flow

```text
Angular caller
  -> listAccessibleWorkspaces
  -> WorkspaceRepositoryTag
  -> infrastructure adapter supplied by a Layer

Angular caller
  -> createWorkspace
  -> validated CreateWorkspaceCommand
  -> WorkspaceRepositoryTag
  -> canonical Workspace
```

Testing support is private and follows the fixture/stub convention used by the
other application libraries.

## Public API

- `listAccessibleWorkspaces`
- `createWorkspace` and its input/error contracts
- `WorkspaceRepositoryTag` and `WorkspaceRepository`
- workspace repository error types

## Verification

```bash
pnpm nx lint workspace-application
pnpm nx run workspace-application:typecheck
pnpm nx run workspace-application:typecheck:test
pnpm nx test workspace-application
```
