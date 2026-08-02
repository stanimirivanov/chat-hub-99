# Workspace Infrastructure

`@chat-hub/infrastructure/workspace` implements workspace and active-membership
discovery with RLS-protected Supabase views, creation with the transactional
`create_workspace` RPC, detail replacement with `update_workspace`, member
archiving with `archive_workspace`, member addition/reactivation with
`add_workspace_member`, role changes with
`change_workspace_member_role`, and member removal with
`remove_workspace_member`. Self-service departure uses the separate
`leave_workspace` command.

## Responsibilities

- Query active workspaces visible to the authenticated user.
- Query active members visible in one selected workspace.
- Execute workspace creation without exposing owner identity as an argument.
- Execute workspace updates without exposing actor identity as an argument.
- Execute workspace archiving without exposing actor identity as an argument.
- Execute member addition or reactivation without exposing actor identity or
  role as arguments.
- Execute member role changes without exposing actor identity as an argument.
- Execute member removal without exposing actor identity as an argument.
- Execute self-departure without exposing actor or target identity as an
  argument.
- Apply stable name/identity ordering.
- Map generated view and RPC rows into validated domain projections.
- Preserve actionable current-slug conflicts as a typed application failure.
- Preserve expected archive authorization and lifecycle rejections as a typed
  application failure.
- Preserve authorization, stale-membership, unchanged-role, and last-owner
  outcomes as typed application failures.
- Translate all other transport and row-validation failures.
- Supply `WorkspaceRepository` through an Effect Layer.

Generated database types and Supabase-shaped query contracts stop here. The
application and domain libraries do not depend on them.

## Runtime flow

```text
listAccessibleWorkspaces use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> current_workspaces view + RLS
  -> WorkspaceSchema decoding

createWorkspace use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> create_workspace RPC
  -> WorkspaceSchema decoding of the canonical result

updateWorkspace use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> update_workspace RPC
  -> active-status/identity checks + WorkspaceSchema decoding

archiveWorkspace use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> archive_workspace RPC
  -> archived-status/identity validation + void acknowledgment

listWorkspaceMembers use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> current_workspace_memberships view + RLS
  -> WorkspaceMemberSchema decoding

changeWorkspaceMemberRole use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> change_workspace_member_role RPC
  -> active target/identity checks + WorkspaceMemberSchema decoding

addWorkspaceMemberByUsername use case
  -> WorkspaceRepositoryTag.addMember
  -> SupabaseWorkspaceRepositoryLayer
  -> add_workspace_member RPC
  -> create or reinstate immutable membership history
  -> default-role/active-target/identity checks + WorkspaceMemberSchema decoding

removeWorkspaceMember use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> remove_workspace_member RPC
  -> removed target/identity validation

leaveWorkspace use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> leave_workspace RPC
  -> removed workspace-membership validation
```

The membership query returns stable identities and roles only. Profile
enrichment remains a separate application capability, preventing the workspace
adapter from depending on profile persistence. Member-addition authorization,
default role assignment, active-profile validation, and immutable membership
reactivation remain transactional database concerns. A former member keeps the
same stable membership identity; the command appends `reinstated` and advances
its head, while an already-active member remains an actionable typed failure.
Role-change/removal
authorization and last-owner invariants are likewise enforced there;
owner-driven removal cannot target the actor, while the separate departure
command can target only the provider-authenticated actor. The adapter translates
stable outcomes without reimplementing them. A removed membership is validated
and acknowledged as `void` rather than being misrepresented as an active
`WorkspaceMember`. The focused client projection contains only operations
needed by implemented slices. Testing support provides fresh query doubles and
canonical generated rows.

Workspace updates replace the complete mutable snapshot and append an immutable
database version. Owner authorization, active-workspace status, concurrent head
advancement, and current-slug uniqueness remain transactional RPC concerns. The
adapter validates the returned identity and active state, translates actionable
authorization and slug-conflict outcomes, and exposes only the canonical domain
workspace.

Workspace archiving appends an immutable archived version and advances the
workspace head transactionally. Owner authorization, active-workspace status,
and concurrent head advancement remain database concerns. The adapter validates
that the RPC acknowledged the requested identity in the archived state, then
returns `void`: an archived row must not cross the application boundary as an
active `Workspace`. Restoration and hard deletion are intentionally outside
this slice.

## Public API

- `SupabaseWorkspaceClientTag` and `SupabaseWorkspaceClient`
- `SupabaseWorkspaceRepositoryLayer`

## Verification

```bash
pnpm nx lint workspace-infrastructure
pnpm nx run workspace-infrastructure:typecheck
pnpm nx run workspace-infrastructure:typecheck:test
pnpm nx test workspace-infrastructure
```
