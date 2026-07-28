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

The store is larger than the helpers because selecting, paging, refreshing, and
sending share one consistency boundary: the selected channel and request
generation. Splitting these methods into independent services would obscure that
invariant. Extract pure logic or a reusable store feature only when another
feature demonstrates the same behavior.

## Testing

Component tests verify rendering and interaction. Store tests verify state
transitions and stale-result behavior. Application and infrastructure behavior
is tested in their owning libraries.

```bash
pnpm nx test client
pnpm nx lint client
pnpm nx build client
```
