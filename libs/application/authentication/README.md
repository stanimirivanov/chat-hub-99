# Authentication Application

`@chat-hub/application/authentication` defines the provider-independent
authentication capability used by the Chat Hub application.

It contains application session contracts, typed authentication failures,
the outbound authentication service port, and use cases for restoring a
session, signing in, registering an account, signing out, and observing session
changes.

## Responsibilities

- Define the application authentication-session projection.
- Define technology-independent authentication errors.
- Define the outbound `AuthenticationService` port.
- Orchestrate session restoration, sign-in, sign-up, sign-out, and session
  observation.
- Runtime-validate and normalize use-case input before requesting a provider.
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
├── email-password-credentials.ts
├── observe-session/
├── restore-session/
├── sign-in/
├── sign-up/
├── sign-out/
└── testing/
```

The testing folder follows the application test-support convention: canonical
fixtures live in `authentication-application-fixtures.ts`, while service stubs
and Layer factories live in `authentication-service.stub.ts`. Its `index.ts`
defines the private test API and is not exported from the production entry
point.

## Public API

The public entry point exports:

- the runtime-validated session contract and credential contracts;
- application authentication errors;
- `AuthenticationServiceTag`;
- the five authentication use cases.

Account registration deliberately models both successful provider outcomes:
an immediately authenticated session and an account that must confirm its
email first. A nullable provider session never leaks into Angular as an
ambiguous success value.

```text
Angular store -> signUp use case -> AuthenticationService Tag
              -> Supabase adapter -> mapped SignUpResult
```

Testing helpers and implementation details remain private.

## Verification

```
pnpm exec nx lint authentication-application
pnpm exec nx run authentication-application:typecheck
pnpm exec nx run authentication-application:typecheck:test
pnpm exec nx test authentication-application
```
