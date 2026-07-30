# Authentication Application

`@chat-hub/application/authentication` defines the provider-independent
authentication capability used by the Chat Hub application.

It contains application session contracts, typed authentication failures,
the outbound authentication service port, and use cases for restoring a
session, signing in, signing out, and observing session changes.

## Responsibilities

- Define the application authentication-session projection.
- Define technology-independent authentication errors.
- Define the outbound `AuthenticationService` port.
- Orchestrate session restoration, sign-in, sign-out, and session observation.
- Normalize use-case input where policy requires it.
- Express dependencies and expected failures through Effect types.

## Dependency rule

```text
Angular presentation and runtime
              ↓
application/authentication
              ↑
infrastructure/authentication
```

The application library may depend on Effect and other inner application or
domain contracts. It must not import Angular, NgRx, Supabase, generated database
types, browser APIs, or Node runtime APIs.

## Effect boundary

Exported use cases build lazy Effect programs:

```
Effect.Effect<Success, AuthenticationError, AuthenticationService>
```

- `Success` describes the produced session value.
- `AuthenticationError` describes expected recoverable failures.
- `AuthenticationService` is the outbound capability required at execution.

Application code does not call `Effect.runPromise`. Tests and the Angular
composition boundary execute the programs.

## Package structure

```text
src/lib/
├── authentication-error.ts
├── authentication-service.ts
├── authentication-session.ts
├── observe-session/
├── restore-session/
├── sign-in/
├── sign-out/
└── testing/
```

The testing folder contains one private Layer factory used by application unit
tests. It is not exported from the production public API.

## Public API

The public entry point exports:

- session and credential contracts;
- application authentication errors;
- `AuthenticationServiceTag`;
- the four authentication use cases.

Testing helpers and implementation details remain private.

## Verification

```
pnpm exec nx lint authentication-application
pnpm exec nx run authentication-application:typecheck
pnpm exec nx run authentication-application:typecheck:test
pnpm exec nx test authentication-application
```
