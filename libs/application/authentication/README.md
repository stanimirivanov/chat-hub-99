# Authentication Application

`@omoikane/application/authentication` defines the provider-independent
authentication capability used by Omoikane.

It contains application session contracts, typed authentication failures,
the outbound authentication service port, and use cases for restoring a
session, signing in, registering an account, requesting password recovery,
resending account confirmation, replacing a recovered password, signing out,
and observing session changes. A separate, focused access-token-validator port
establishes the minimum request identity required by trusted server workflows.

## Responsibilities

- Define the application authentication-session projection.
- Define technology-independent authentication errors.
- Define the outbound `AuthenticationService` port.
- Define the stateless `AccessTokenValidator` server port without widening the
  browser-session service.
- Orchestrate session restoration, sign-in, sign-up, confirmation-email
  resend, password recovery, sign-out, and session observation.
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

Application code does not call `Effect.runPromise`. Tests and the Angular or
Nest composition boundary execute the programs.

## Package structure

```text
src/lib/
├── authentication-error.ts
├── authentication-service.ts
├── authentication-session.ts
├── email-redirect-request.ts
├── email-password-credentials.ts
├── observe-session/
├── resend-confirmation-email/
├── request-password-reset/
├── restore-session/
├── sign-in/
├── sign-up/
├── sign-out/
├── update-password/
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
- `AccessTokenValidatorTag` and the immutable request-identity contract;
- the browser authentication and server token-validation use cases.

Account registration deliberately models both successful provider outcomes:
an immediately authenticated session and an account that must confirm its
email first. The latter retains the normalized address required by the resend
workflow. A nullable provider session never leaks into Angular as an ambiguous
success value.

```text
Angular store -> signUp use case -> AuthenticationService Tag
              -> Supabase adapter -> mapped SignUpResult
```

Testing helpers and implementation details remain private.

Password recovery is modeled as two commands connected by an observed session
change. The request command validates an absolute HTTP(S) callback URL without
depending on browser APIs. The session stream distinguishes an ordinary session
notification from recovery intent, while keeping provider event names out of
the application contract. The update command validates matching replacement
password fields before invoking the provider port.

```text
request reset -> provider email -> password-recovery session change
              -> update password -> authenticated session retained
```

The reset-request success value is always `void`; callers must render the same
completion for existing and unknown email addresses.

Confirmation resend follows the same non-enumerating email/callback boundary.
The shared decoder normalizes those two structural fields, while each use case
retains its own typed validation failures and semantic provider operation.

## Verification

```
pnpm exec nx lint authentication-application
pnpm exec nx run authentication-application:typecheck
pnpm exec nx run authentication-application:typecheck:test
pnpm exec nx test authentication-application
```
