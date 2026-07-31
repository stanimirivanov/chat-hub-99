# Workspace Infrastructure

`@chat-hub/infrastructure/workspace` implements workspace and active-membership
discovery with RLS-protected Supabase views, and creation with the existing
transactional `create_workspace` RPC.

## Responsibilities

- Query active workspaces visible to the authenticated user.
- Query active members visible in one selected workspace.
- Execute workspace creation without exposing owner identity as an argument.
- Apply stable name/identity ordering.
- Map generated view and RPC rows into validated domain projections.
- Preserve actionable current-slug conflicts as a typed application failure.
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

listWorkspaceMembers use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> current_workspace_memberships view + RLS
  -> WorkspaceMemberSchema decoding
```

The membership query returns stable identities and roles only. Profile
enrichment remains a separate application capability, preventing the workspace
adapter from depending on profile persistence. The focused client projection
contains only operations needed by implemented slices. Testing support provides
fresh query doubles and canonical generated rows.

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
