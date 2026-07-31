# Chat Hub Angular Client

The client is the delivery mechanism for Chat Hub. It renders application state,
translates user interaction into application use-case calls, and composes the
Effect/Supabase runtime through Angular dependency injection.

## Layer responsibilities

- `core/`: application-wide runtime composition and thin Angular boundary
  services
- `features/`: vertical presentation slices with components and feature-local
  Signal Stores
- `app.config.ts`: Angular provider composition
- `app.routes.ts`: route-level feature composition
- `environments/`: build-time environment configuration

Cross-boundary client imports use `@client/*` and
`@client-environments/*`. Closely related modules within one feature or core
folder continue to use relative imports so locality remains visible.

## Angular boundary

Effect use cases remain framework-independent. Services under `core` run
configured Effects and return Promises to Angular callers. They should not
reproduce business rules or database mapping.

```text
Component event
    ↓
Feature Signal Store
    ↓
Angular application service
    ↓
Effect use case + configured Layer
```

## Signal Store guideline

A feature store owns presentation state and coordination for one user-facing
capability. It may track loading status, stale-request protection, and local
collection updates. Business validation belongs in the domain or application
layer.

Do not create a global store merely because data may later be shared. Promote
state only after two implemented features require coordinated ownership.

## Feature structure

The initial `channel-messages` slice keeps closely related files together:

- component: template interaction and rendering
- store: asynchronous presentation workflow
- state: explicit state contract and status types
- collection helpers: pure deduplication operations
- error adapter: stable presentation-safe error shape

Message history retains the stable profile identity of each author. It uses
the root authentication store only to label the current user's messages and
show Edit/Delete controls for those messages. This is presentation behavior,
not authorization: Supabase command policies remain the security boundary.
Human-readable profiles for other authors require a separate implemented
profile-discovery slice.

The store is larger than the helpers because selecting, paging, refreshing, and
sending share one consistency boundary: the selected channel and request
generation. Splitting these methods into independent services would obscure that
invariant. Extract pure logic or a reusable store feature only when another
feature demonstrates the same behavior.

The `workspace-navigation` slice owns a feature-scoped store. It loads active
workspaces visible through database RLS and retains one explicit selection.
Selection is presentation state; workspace discovery remains an application
use case.

The nested `channel-navigation` slice reacts to that selected workspace, loads
only its active RLS-visible channels, and owns a separate feature-scoped
selection store. Its request generation prevents a late response for a
previous workspace from replacing the current collection. Selecting a channel
composes the existing `channel-messages` component through its typed input;
the two stores do not depend on each other.

The `current-profile` slice enriches the authenticated header with the
RLS-visible profile belonging to the session identity. It keeps the
authentication session email as a reliable fallback while profile data loads
or fails. Its feature-scoped store does not duplicate session ownership, and a
late response for a previous session identity cannot replace the current
profile. Avatar values are decoded but are not rendered until a concrete media
or URL policy is implemented.

Workspace and channel selections are reflected in the root route as validated
slugs:

```text
/?workspace=chat-hub-development&channel=general
```

The URL is the browser-history and deep-link source of selection, while the
stores retain canonical branded identifiers after matching a slug against the
RLS-visible collection. Changing workspaces removes the channel parameter.
Unknown slugs are removed with history replacement only after their owning
collection loaded successfully; repository failures therefore remain retryable
and are not misclassified as invalid navigation.

## Testing

Component tests verify rendering and interaction. Store tests verify state
transitions and stale-result behavior. Application and infrastructure behavior
is tested in their owning libraries.

Angular application services are the Effect execution boundary. They run lazy
application Effects through the shared managed runtime and expose expected
failures as typed `Either` values. Signal Stores match those values into
presentation state; they do not compose Layers, run Effects, or catch expected
application failures as `unknown`.

```bash
pnpm nx lint client
pnpm nx run client:typecheck
pnpm nx run client:typecheck:test
pnpm nx test client
```
