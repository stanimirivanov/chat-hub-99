# ADR 0001: NestJS and Effect runtime boundary

> **Status:** Accepted  
> **Date:** 9 August 2026  
> **Decision owners:** Omoikane architecture

## Context

OMO-ARC-000 selects a NestJS modular monolith for trusted HTTP capabilities and
Effect for application services, typed failures, and dependency composition.
It does not define how the two dependency systems meet. Without one explicit
boundary, controllers could accumulate business orchestration, Nest providers
could leak into application libraries, or a new Effect runtime could be built
for every request.

Phase 3 needs a small server runtime that preserves the dependency rules already
used by the Angular application:

```text
runtime adapter -> infrastructure -> application -> domain
```

## Decision

`apps/server` is the only NestJS composition root. Nest owns:

- process bootstrap and shutdown;
- the Fastify HTTP adapter;
- configuration loading and startup validation;
- routing, transport DTOs, guards, status codes, headers, and OpenAPI;
- conversion between typed application failures and HTTP problem responses;
- health endpoints and transport-level telemetry.

Effect owns:

- application workflow orchestration;
- typed success, failure, and service-requirement channels;
- infrastructure service construction through Layers;
- resource scopes, interruption, retry policy, and application telemetry.

The server constructs one long-lived Effect runtime from the complete server
Layer during application startup. A single Nest provider owns that runtime,
executes fully composed Effects at controllers and guards, and disposes it
during graceful shutdown. Request handlers must not construct Layers or call
`Effect.runPromise` directly.

Controllers remain translation adapters. They validate transport input, obtain
the authenticated request context, invoke one application use case through the
runtime provider, and translate the result. They do not query Supabase, encode
authorization policy, or coordinate several repositories.

Nest modules group capabilities and composition; they are not an alternative
domain or application layer. Domain, application, and infrastructure libraries
must not import NestJS or Fastify. Provider-specific types stop in
infrastructure, and HTTP DTOs stop in `apps/server` unless a demonstrated
cross-runtime consumer justifies a contracts library.

## Consequences

- The process pays Layer construction cost once and can safely own scoped
  clients and telemetry exporters.
- Shutdown can interrupt active fibers and release Effect-managed resources
  before Nest exits.
- Tests can exercise application workflows without starting Nest, and
  transport tests can replace the runtime provider at the HTTP boundary.
- The bridge is intentionally small, but it is a required runtime abstraction:
  direct Effect execution scattered across controllers is forbidden.
- Fastify-specific APIs remain inside server bootstrap or transport adapters.
  Capability modules should prefer Nest's platform-neutral APIs.
- Nest request-scoped providers are not used for ordinary application
  dependencies. Per-request identity is immutable input, not a request-scoped
  service graph.

## Rejected alternatives

- **Implement workflows as Nest services:** this would duplicate the existing
  application layer and replace typed Effect requirements with framework DI.
- **Create a runtime per request:** this would repeatedly acquire long-lived
  resources and make shutdown ownership unclear.
- **Let controllers run Effects directly:** this would duplicate execution,
  defect handling, interruption, and telemetry policy.
- **Expose Nest or Fastify types from libraries:** this would reverse the
  established dependency direction and make application tests runtime-specific.

## Affected decisions and documents

This ADR refines, but does not supersede, OMO-ARC-000 decisions D-003 and D-006.
It is reflected in OMO-ARC-003 and the Phase 3 section of OMO-RMP-001.

## Implementation and verification implications

- `apps/server` receives `project:app` and `runtime:server` Nx tags.
- The existing layer constraints remain authoritative; a server-runtime tag may
  depend inward but no library may depend on it.
- Runtime construction and disposal require focused tests.
- An HTTP integration test must prove typed application failures are converted
  to the documented problem format without exposing causes or stack traces.
- The first server slice creates only the bridge, bootstrap, OpenAPI document,
  and liveness endpoint; capability-specific Layers arrive with their vertical
  slices.
