# Workspace Application

`@chat-hub/application/workspace` owns provider-independent workflows for
discovering accessible workspaces and active members, creating and editing
workspaces, archiving workspaces, adding active profiles as members, changing
active member roles, suspending and reactivating members, removing active
members, leaving a workspace, and consent-based invitations for existing users.
It also owns the provider-independent stream that refreshes accessible
workspace snapshots when the authenticated user's membership changes.

## Responsibilities

- Define the `WorkspaceRepository` outbound port.
- Define typed read, creation, update, archive, member-addition, role-change,
  removal, suspension, invitation, and expected command failures.
- List active, accessible workspaces through an Effect use case.
- Observe accessible-workspace invalidations and resolve every signal through
  the same authoritative list operation.
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
  profile identity with the default member role, reactivating its preserved
  left, removed, or suspended history when present.
- Normalize and validate role-change targets and roles before repository access.
- Change roles without accepting client-supplied actor identity.
- Normalize removal targets and optional audit reasons before repository access.
- Remove members without accepting client-supplied actor identity.
- Normalize suspension targets and optional audit reasons through the shared
  owner-driven membership-mutation decoder.
- Suspend members without accepting client-supplied actor identity.
- Normalize and validate the workspace identity before self-departure.
- Leave a workspace without accepting either client-supplied actor or target
  identity.
- Resolve an exact active username and create a pending invitation without
  granting immediate membership.
- List pending invitations addressed to the authenticated user.
- Validate invitation identities before accepting or declining them; recipient
  identity remains provider-session data rather than caller input.
- Validate a selected workspace before listing invitations managed by its
  authenticated active owner.
- Validate an invitation identity before cancelling it without accepting actor
  or workspace authority as caller-supplied data.

It does not know about Supabase, generated database rows, Angular, selection
state, profile persistence, channels, or workspace restoration/deletion.

## Runtime flow

```text
Angular caller
  -> addWorkspaceMemberByUsername(input)
  -> ProfileRepositoryTag exact active-profile lookup
  -> WorkspaceRepositoryTag.addMember create-or-reactivate command
  -> canonical WorkspaceMember + Profile

Angular caller
  -> listAccessibleWorkspaces
  -> WorkspaceRepositoryTag
  -> infrastructure adapter supplied by a Layer

Angular caller
  -> observeAccessibleWorkspaces Stream
  -> WorkspaceRepositoryTag.accessChanges invalidations
  -> WorkspaceRepositoryTag.listAccessible authoritative refresh
  -> validated Workspace snapshots

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
  -> suspendWorkspaceMember(input)
  -> validated SuspendWorkspaceMemberCommand
  -> WorkspaceRepositoryTag
  -> validated suspended membership acknowledgment

Angular caller
  -> leaveWorkspace(input)
  -> validated WorkspaceId
  -> WorkspaceRepositoryTag.leave
  -> validated left membership acknowledgment

Angular caller
  -> inviteWorkspaceMemberByUsername(input)
  -> ProfileRepositoryTag exact active-profile lookup
  -> WorkspaceRepositoryTag.inviteMember
  -> canonical pending WorkspaceInvitation

Angular caller
  -> listPendingWorkspaceInvitations
  -> WorkspaceRepositoryTag.listPendingInvitations
  -> validated invitation + current Workspace projections

Angular caller
  -> acceptWorkspaceInvitation / declineWorkspaceInvitation
  -> validated WorkspaceInvitationId
  -> WorkspaceRepositoryTag recipient command
  -> active default-member projection / decline acknowledgment

Angular caller
  -> listPendingWorkspaceInvitationsForOwner
  -> validated WorkspaceId
  -> WorkspaceRepositoryTag.listPendingInvitationsForWorkspace
  -> validated invitation + current username projections

Angular caller
  -> cancelWorkspaceInvitation
  -> validated WorkspaceInvitationId
  -> WorkspaceRepositoryTag.cancelInvitation
  -> cancellation acknowledgment
```

Testing support is private and follows the fixture/stub convention used by the
other application libraries.

## Public API

- `listAccessibleWorkspaces`
- `observeAccessibleWorkspaces`
- `listWorkspaceMembers`
- `createWorkspace` and its input/error contracts
- `updateWorkspace` and its input/error contracts
- `archiveWorkspace` and its input/error contracts
- `addWorkspaceMemberByUsername` and its input/result/error contracts
- `changeWorkspaceMemberRole` and its input/error contracts
- `removeWorkspaceMember` and its input/error contracts
- `suspendWorkspaceMember` and its input/error contracts
- `leaveWorkspace` and its input/error contracts
- `inviteWorkspaceMemberByUsername` and its input/error contracts
- `listPendingWorkspaceInvitations`
- `listPendingWorkspaceInvitationsForOwner`
- `acceptWorkspaceInvitation` and `declineWorkspaceInvitation`
- `cancelWorkspaceInvitation`
- `WorkspaceRepositoryTag` and `WorkspaceRepository`
- workspace repository error types

The observation use case uses `Stream.unwrap` to obtain the repository from
the Effect environment once per subscription. `Stream.mapEffect` then performs
the repository read sequentially for every invalidation, preserving the typed
failure channel and preventing provider event payloads from becoming
application data.

## Verification

```bash
pnpm nx lint workspace-application
pnpm nx run workspace-application:typecheck
pnpm nx run workspace-application:typecheck:test
pnpm nx test workspace-application
```
