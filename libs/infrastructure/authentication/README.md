# Authentication Infrastructure

`@chat-hub/infrastructure/authentication` implements the application
authentication port with Supabase Auth.

It translates Supabase sessions, promises, callbacks, and errors into
provider-independent application contracts.

## Responsibilities

- Define the focused Supabase Auth client dependency used by the adapter.
- Restore the current Supabase browser session.
- Sign in with email and password.
- Register email/password accounts and distinguish immediate sessions from
  email-confirmation completion.
- Sign out of the current session.
- Adapt `onAuthStateChange` to a scoped Effect Stream.
- Map Supabase sessions to `AuthenticationSession`.
- Translate Supabase Auth failures into application authentication errors.
- Supply the implementation through an Effect Layer.

## Dependency rule

```text
Angular composition
        ↓ supplies configured client
infrastructure/authentication
        ↓ implements
application/authentication
```

The application library never imports Supabase. Raw Supabase sessions, tokens,
callbacks, and `AuthError` values stop at this infrastructure boundary.

The adapter maps `auth.signUp` responses before crossing that boundary:

```text
Supabase session   -> authenticated application session
Supabase user only -> confirmation required
Supabase AuthError -> typed application authentication error
```

## Package structure

```text
src/lib/
├── errors/
│   └── map-authentication-error.ts
├── mapping/
│   └── map-authentication-session.ts
├── session/
│   └── make-session-changes-stream.ts
├── supabase-authentication-client.ts
├── supabase-authentication-service.ts
└── supabase-authentication-service.layer.ts
```

The `errors`, `mapping`, and `session` folders expose cohesive local APIs
through `index.ts`. Modules inside those folders still import siblings
directly. Private test support follows the message infrastructure convention:
`authentication-fixtures.ts` owns canonical provider values and
`supabase-authentication-client.stub.ts` owns fresh client doubles.

## Stream lifecycle

`onAuthStateChange` is a push-based, long-lived provider API.

The adapter converts it to a scoped Effect Stream:

```text
stream subscription
          ↓
register Supabase listener
          ↓
emit mapped application sessions
          ↓
stream interruption
          ↓
unsubscribe Supabase listener
```

Angular owns the running Fiber and interrupts it when the authentication store's
injection context is destroyed.

## Public API

The public entry point exports only:

- `SupabaseAuthenticationClientTag`;
- `SupabaseAuthenticationClient`;
- `SupabaseAuthenticationServiceLayer`.

The concrete service factory, mappers, and stream adapter remain internal.

## Local troubleshooting

The adapter maps provider and transport failures to typed application errors.
The Angular runtime boundary may log the preserved cause in non-production
builds, but the UI displays only safe presentation messages.

For local Supabase HTTP 500 responses, inspect the Auth container:

```shell
docker logs supabase_auth_chat-hub-99 --tail 200
```

A GoTrue error containing:

```test
converting NULL to string is unsupported
```

indicates malformed directly seeded data in `auth.users`, not an adapter or
Angular failure. Correct supabase/seed.sql and verify the result through a
clean `pnpm db:reset`.

Never log credentials, access tokens, refresh tokens, API secrets, or complete
Supabase session objects.

## Verification

```shell
pnpm exec nx lint authentication-infrastructure
pnpm exec nx run authentication-infrastructure:typecheck
pnpm exec nx run authentication-infrastructure:typecheck:test
pnpm exec nx test authentication-infrastructure
```
