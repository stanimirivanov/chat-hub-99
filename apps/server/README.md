# Omoikane server

## Purpose

This Nx application is the NestJS composition and HTTP boundary for trusted
Omoikane capabilities. It uses Fastify for HTTP and owns one long-lived Effect
runtime. The current bootstrap slice exposes process liveness and OpenAPI only.

## Responsibilities

- decode server-owned process configuration before listening;
- own Fastify and NestJS process startup and graceful shutdown;
- construct, initialize, execute, and dispose the server Effect runtime;
- expose `/health/live` without consulting downstream dependencies;
- publish the implemented HTTP contract at `/openapi.json`.

It does not authenticate users, access Supabase, expose readiness, implement an
Analysis Run, or proxy existing Angular-to-Supabase collaboration operations.

## Dependency rule

`apps/server` is an outer runtime and may compose infrastructure, application,
and domain libraries. Those libraries must never depend on `apps/server`,
NestJS, Fastify, or its transport DTOs. Controllers translate HTTP only; use
cases retain business orchestration and typed failures.

## Structure

```text
src/
  main.ts                         process entry point and network listener
  create-server.ts                testable Nest/Fastify construction
  app/
    server.module.ts              composition root
    platform/
      configuration/              environment decoding
      effect-runtime/             Effect execution and lifecycle bridge
      health/                     liveness transport
```

## Runtime flow

```text
process environment -> runtime schema -> ServerConfig
                                      -> Nest + Fastify
                                      -> Effect runtime initialization
GET /health/live -> HealthController -> validated build version -> JSON
application shutdown -> Nest lifecycle -> Effect runtime disposal
```

A Managed Runtime is Effect's long-lived executor built from a Layer. The Layer
is empty in this slice because no application service is required. Future
capability Layers are composed at this boundary; controllers do not construct
Layers or call `Effect.runPromise` themselves.

## Configuration

| Variable                  | Default       | Meaning                        |
| ------------------------- | ------------- | ------------------------------ |
| `OMOIKANE_ENV`            | `local`       | Deployment environment label.  |
| `OMOIKANE_SERVER_HOST`    | `0.0.0.0`     | Network interface to bind.     |
| `OMOIKANE_SERVER_PORT`    | `3333`        | TCP port from 1 through 65535. |
| `OMOIKANE_SERVER_VERSION` | `development` | Build version shown by health. |

Empty values use local defaults. A malformed non-empty value fails startup
before the server accepts traffic.

## Extension guidance

- Add readiness only with the authentication slice that introduces a critical
  Supabase dependency.
- Add transport DTOs inside the owning server capability folder.
- Add business rules and ports to domain and application libraries.
- Add provider queries, mappings, and Layers to infrastructure libraries.
- Merge a capability Layer into the shared runtime only when its first use case
  is implemented.

## Verification

```bash
pnpm server:test
pnpm server:build
pnpm nx run server:typecheck
pnpm nx run server:typecheck:test
pnpm nx run server:lint
```

Run `pnpm server:dev`, then inspect:

```text
http://localhost:3333/health/live
http://localhost:3333/openapi.json
```
