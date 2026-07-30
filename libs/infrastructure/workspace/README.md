# Workspace Infrastructure

`@chat-hub/infrastructure/workspace` implements workspace discovery with the
RLS-protected Supabase `current_workspaces` view.

## Responsibilities

- Query active workspaces visible to the authenticated user.
- Apply stable name/identity ordering.
- Map generated view rows into validated domain projections.
- Translate transport and row-validation failures into application errors.
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
