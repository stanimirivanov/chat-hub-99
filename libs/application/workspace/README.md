# Workspace Application

`@chat-hub/application/workspace` owns provider-independent workflows for
discovering accessible workspaces and active members, creating a workspace,
changing active member roles, and removing active members.

## Responsibilities

- Define the `WorkspaceRepository` outbound port.
- Define typed read, creation, role-change, removal, and expected command
  failures.
- List active, accessible workspaces through an Effect use case.
- List active, RLS-visible members for one selected workspace.
- Normalize and validate workspace creation input before repository access.
- Create a workspace without accepting client-supplied owner identity.
- Normalize and validate role-change targets and roles before repository access.
- Change roles without accepting client-supplied actor identity.
- Normalize removal targets and optional audit reasons before repository access.
- Remove members without accepting client-supplied actor identity.

It does not know about Supabase, generated database rows, Angular, selection
state, profile display data, channels, or workspace update/archive/member-add
commands.

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

Angular caller
  -> listWorkspaceMembers(workspaceId)
  -> WorkspaceRepositoryTag
  -> validated WorkspaceMember values

Angular caller
  -> changeWorkspaceMemberRole(input)
  -> validated ChangeWorkspaceMemberRoleCommand
  -> WorkspaceRepositoryTag
  -> canonical WorkspaceMember

Angular caller
  -> removeWorkspaceMember(input)
  -> validated RemoveWorkspaceMemberCommand
  -> WorkspaceRepositoryTag
  -> validated removed membership acknowledgment
```

Testing support is private and follows the fixture/stub convention used by the
other application libraries.

## Public API

- `listAccessibleWorkspaces`
- `listWorkspaceMembers`
- `createWorkspace` and its input/error contracts
- `changeWorkspaceMemberRole` and its input/error contracts
- `removeWorkspaceMember` and its input/error contracts
- `WorkspaceRepositoryTag` and `WorkspaceRepository`
- workspace repository error types

## Verification

```bash
pnpm nx lint workspace-application
pnpm nx run workspace-application:typecheck
pnpm nx run workspace-application:typecheck:test
pnpm nx test workspace-application
```
