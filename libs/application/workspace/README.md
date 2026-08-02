# Workspace Application

`@chat-hub/application/workspace` owns provider-independent workflows for
discovering accessible workspaces and active members, creating and editing
workspaces, archiving workspaces, adding active profiles as members, changing
active member roles, removing active members, and leaving a workspace.

## Responsibilities

- Define the `WorkspaceRepository` outbound port.
- Define typed read, creation, update, archive, member-addition, role-change,
  removal, and expected command failures.
- List active, accessible workspaces through an Effect use case.
- List active, RLS-visible members for one selected workspace.
- Normalize and validate workspace creation input before repository access.
- Create a workspace without accepting client-supplied owner identity.
- Normalize and validate complete workspace replacement details through the
  same private decoder used by creation.
- Update a workspace without accepting client-supplied actor identity.
- Normalize and validate the workspace identity before archiving.
- Archive a workspace without accepting client-supplied actor identity or
  representing the archived version as an active domain workspace.
- Resolve an exact active username through the profile port and add that stable
  profile identity with the default member role.
- Normalize and validate role-change targets and roles before repository access.
- Change roles without accepting client-supplied actor identity.
- Normalize removal targets and optional audit reasons before repository access.
- Remove members without accepting client-supplied actor identity.
- Normalize and validate the workspace identity before self-departure.
- Leave a workspace without accepting either client-supplied actor or target
  identity.

It does not know about Supabase, generated database rows, Angular, selection
state, profile persistence, channels, or workspace restoration/deletion.

## Runtime flow

```text
Angular caller
  -> addWorkspaceMemberByUsername(input)
  -> ProfileRepositoryTag exact active-profile lookup
  -> WorkspaceRepositoryTag.addMember
  -> canonical WorkspaceMember + Profile

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
  -> updateWorkspace
  -> validated UpdateWorkspaceCommand
  -> WorkspaceRepositoryTag
  -> canonical Workspace

Angular caller
  -> archiveWorkspace
  -> validated WorkspaceId
  -> WorkspaceRepositoryTag
  -> void acknowledgment

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

Angular caller
  -> leaveWorkspace(input)
  -> validated WorkspaceId
  -> WorkspaceRepositoryTag.leave
  -> validated removed membership acknowledgment
```

Testing support is private and follows the fixture/stub convention used by the
other application libraries.

## Public API

- `listAccessibleWorkspaces`
- `listWorkspaceMembers`
- `createWorkspace` and its input/error contracts
- `updateWorkspace` and its input/error contracts
- `archiveWorkspace` and its input/error contracts
- `addWorkspaceMemberByUsername` and its input/result/error contracts
- `changeWorkspaceMemberRole` and its input/error contracts
- `removeWorkspaceMember` and its input/error contracts
- `leaveWorkspace` and its input/error contracts
- `WorkspaceRepositoryTag` and `WorkspaceRepository`
- workspace repository error types

## Verification

```bash
pnpm nx lint workspace-application
pnpm nx run workspace-application:typecheck
pnpm nx run workspace-application:typecheck:test
pnpm nx test workspace-application
```
