# Workspace Domain

`@omoikane/domain/workspace` contains the technology-independent active and
archived workspace projections and active-membership projections required by
presentation.

## Responsibilities

- Define branded workspace identity.
- Validate workspace names, normalized slugs, and optional descriptions.
- Expose the active workspace projection consumed by application use cases.
- Expose a distinct archived projection with its lifecycle timestamp so it
  cannot enter active navigation accidentally.
- Validate active member identities and the closed owner/member role vocabulary.
- Validate workspace-invitation identities and the closed `pending`,
  `accepted`, `declined`, and `cancelled` lifecycle.

It does not own persistence, membership authorization, selection state, or
Angular presentation. Those responsibilities remain in infrastructure,
database policies, and the client feature.

## Dependency rule

This library may depend on Effect Schema and the profile domain's stable
identity. It must not depend on Angular, NgRx, Supabase, generated database
types, or application services.

## Public API

- `WorkspaceIdSchema` and `WorkspaceId`
- `WorkspaceNameSchema` and `WorkspaceSlugSchema`
- `WorkspaceSchema` and `Workspace`
- `ArchivedWorkspaceSchema` and `ArchivedWorkspace`
- `WorkspaceMemberSchema`, `WorkspaceMember`, and their role schema/type
- `WorkspaceInvitationIdSchema`, `WorkspaceInvitationSchema`, and their types

## Verification

```bash
pnpm nx lint workspace-domain
pnpm nx run workspace-domain:typecheck
pnpm nx run workspace-domain:typecheck:test
pnpm nx test workspace-domain
```
