# Workspace Infrastructure

`@chat-hub/infrastructure/workspace` implements workspace and active-membership
discovery with RLS-protected Supabase views, creation with the transactional
`create_workspace` RPC, detail replacement with `update_workspace`, member
addition with `add_workspace_member`, role changes with
`change_workspace_member_role`, and member removal with
`remove_workspace_member`.

## Responsibilities

- Query active workspaces visible to the authenticated user.
- Query active members visible in one selected workspace.
- Execute workspace creation without exposing owner identity as an argument.
- Execute workspace updates without exposing actor identity as an argument.
- Execute member addition without exposing actor identity or role as arguments.
- Execute member role changes without exposing actor identity as an argument.
- Execute member removal without exposing actor identity as an argument.
- Apply stable name/identity ordering.
- Map generated view and RPC rows into validated domain projections.
- Preserve actionable current-slug conflicts as a typed application failure.
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
  -> default-role/active-target/identity checks + WorkspaceMemberSchema decoding

removeWorkspaceMember use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> remove_workspace_member RPC
  -> removed target/identity validation
```

The membership query returns stable identities and roles only. Profile
enrichment remains a separate application capability, preventing the workspace
adapter from depending on profile persistence. Member-addition authorization,
default role assignment, active-profile validation, and immutable membership
history remain transactional database concerns. Role-change/removal
authorization, self-removal prevention, and last-owner invariants are likewise
enforced there; the adapter translates stable outcomes without reimplementing
them. A removed membership is validated and acknowledged as `void` rather than
being misrepresented as an active `WorkspaceMember`. The focused client
projection contains only operations needed by implemented slices. Testing
support provides fresh query doubles and canonical generated rows.

Workspace updates replace the complete mutable snapshot and append an immutable
database version. Owner authorization, active-workspace status, concurrent head
advancement, and current-slug uniqueness remain transactional RPC concerns. The
adapter validates the returned identity and active state, translates actionable
authorization and slug-conflict outcomes, and exposes only the canonical domain
workspace.

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
