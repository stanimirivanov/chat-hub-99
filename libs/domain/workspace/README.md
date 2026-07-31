# Workspace Domain

`@chat-hub/domain/workspace` contains the technology-independent workspace
projection required by navigation.

## Responsibilities

- Define branded workspace identity.
- Validate workspace names, normalized slugs, and optional descriptions.
- Expose the active workspace projection consumed by application use cases.

It does not own persistence, membership authorization, selection state, or
Angular presentation. Those responsibilities remain in infrastructure,
database policies, and the client feature.

## Dependency rule

This library may depend on Effect Schema. It must not depend on Angular, NgRx,
Supabase, generated database types, or application services.

## Public API

- `WorkspaceIdSchema` and `WorkspaceId`
- `WorkspaceNameSchema` and `WorkspaceSlugSchema`
- `WorkspaceSchema` and `Workspace`

## Verification

```bash
pnpm nx lint workspace-domain
pnpm nx run workspace-domain:typecheck
pnpm nx run workspace-domain:typecheck:test
pnpm nx test workspace-domain
```
