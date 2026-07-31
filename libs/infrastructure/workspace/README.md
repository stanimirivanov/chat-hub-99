# Workspace Infrastructure

`@chat-hub/infrastructure/workspace` implements workspace discovery with the
RLS-protected Supabase `current_workspaces` view and creation with the existing
transactional `create_workspace` RPC.

## Responsibilities

- Query active workspaces visible to the authenticated user.
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
```

The focused client projection contains only operations needed by this slice.
Testing support provides fresh query doubles and canonical generated rows.

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
