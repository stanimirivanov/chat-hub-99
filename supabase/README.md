# Chat Hub Supabase

This directory contains the local Supabase configuration, PostgreSQL migrations,
development seed data, generated database types, and database verification tests
for Chat Hub.

The database is treated as an architectural boundary rather than as passive
storage. It owns persistence invariants, authorization policies, immutable
aggregate history, command functions, and database-level validation.

## Responsibilities

The `supabase` directory is responsible for:

- configuring the local Supabase development stack;
- defining the PostgreSQL schema through ordered migrations;
- implementing database command functions;
- enforcing persisted profile-avatar URL integrity;
- enforcing authorization through Row Level Security;
- providing deterministic local development data;
- verifying database behavior with pgTAP tests;
- supporting generation of TypeScript database types;
- documenting database-specific operational troubleshooting.

Angular, application, domain, and infrastructure code must not duplicate
invariants already enforced by the database.

## Directory structure

```text
supabase/
├── config.toml
├── migrations/
├── scripts/
│   └── verify-database.ps1
├── seed.sql
├── tests/
│   └── database/
├── types/
│   └── database.types.ts
└── README.md
```

### `config.toml`

Defines the local Supabase services and ports.

Relevant defaults include:

| Service                  |              URL or port |
| ------------------------ | -----------------------: |
| Supabase API             | `http://127.0.0.1:54321` |
| PostgreSQL               |                  `54322` |
| Supabase Studio          | `http://127.0.0.1:54323` |
| PostgreSQL major version |                     `17` |

Supabase Auth uses `http://127.0.0.1:4200` as its local site URL and permits the
equivalent localhost development origins as authentication-email redirects. These
values must match the Angular development origin. Hosted environments must set
their own allowlisted site and redirect URLs; the local configuration is not a
production redirect policy.

Local email confirmation is enabled. New email/password registrations therefore
exercise the same confirmation-required and resend flow used by hosted
environments, while the deterministic users inserted by `seed.sql` remain
pre-confirmed for ordinary local sign-in.

The configured project identifier is:

```text
chat-hub-99
```

The seed file is applied automatically through:

```toml
[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

### `migrations/`

Contains the ordered database history.

Migrations define:

- database extensions and shared prerequisites;
- immutable profile and workspace models;
- workspace membership history;
- channel aggregates;
- message aggregates;
- command functions;
- read models and projections;
- Row Level Security policies;
- Realtime publication of RLS-protected message-head changes.

Migrations are append-only after they have been shared or applied outside an
individual disposable development database.

Do not silently edit an existing historical migration to introduce a new schema
change. Create a new migration instead.

### `seed.sql`

Creates deterministic local development data after migrations have been applied.

The current seed includes:

- one workspace owner;
- one ordinary workspace member;
- one outsider;
- one active workspace;
- two active channels;
- representative messages.

The workspace, membership, channel, and message aggregates are created through
the same database command functions used by the application. This prevents the
seed from bypassing application invariants.

Auth users are assigned stable UUIDs so database relationships and automated
tests remain reproducible.

### `tests/database/`

Contains pgTAP tests for:

- profile commands;
- workspace commands;
- workspace membership commands;
- channel commands;
- message commands;
- profile and workspace read policies;
- membership read policies;
- channel read policies;
- message read policies;
- message Realtime publication configuration.

Database tests should verify externally observable behavior rather than internal
implementation details wherever possible.

### `types/`

Contains Supabase-generated database types.

The canonical application-facing generated type file is maintained through the
root database type-generation scripts. Generated files must not be edited
manually.

## Prerequisites

Local database development requires:

- Docker Desktop;
- Supabase CLI;
- Node.js;
- pnpm.

Confirm that Docker is running before starting Supabase.

## Common commands

Run commands from the repository root.

### Start the local Supabase stack

```shell
pnpm supabase:start
```

### Stop the local Supabase stack

```shell
pnpm supabase:stop
```

### Show local service status and credentials

```shell
pnpm supabase:status
```

This command reports the active API URL, Studio URL, database URL, and local API
keys.

### Reset the database

```shell
pnpm db:reset
```

This command:

1. recreates the local database;
2. applies all migrations in order;
3. executes `supabase/seed.sql`.

All manually modified local data is discarded.

### Prepare the full local database environment

```shell
pnpm db:prepare
```

This starts Supabase and performs a clean database reset.

### Create a migration

```shell
pnpm db:migration:new -- <migration-name>
```

For example:

```shell
pnpm db:migration:new -- create_channel_invitation_model
```

Use a descriptive, imperative migration name.

### Lint the database

```shell
pnpm db:lint
```

The configured command reports database lint findings at error level.

### Run database tests

```shell
pnpm db:test
```

This executes the pgTAP test suite under `supabase/tests/database`.

### Generate database types

```shell
pnpm db:types
```

### Verify generated types are current

```shell
pnpm db:types:check
```

This regenerates the types and fails when the committed generated output differs.

### Run full database verification

```shell
pnpm db:verify
```

The verification pipeline performs:

```text
database reset
    ↓
database lint
    ↓
pgTAP tests
    ↓
generated-type consistency check
```

Run this command before committing database changes.

### Run all project and database verification

```shell
pnpm verify:all
```

## Migration workflow

Use the following workflow for database changes.

### 1. Create a new migration

```shell
pnpm db:migration:new -- <descriptive-name>
```

### 2. Implement the schema change

Keep responsibilities separated where practical:

- aggregate tables and immutable history;
- command functions;
- read policies;
- supporting indexes and constraints.

### 3. Add or update pgTAP tests

Tests should cover:

- successful commands;
- rejected invalid transitions;
- authorization boundaries;
- projection advancement;
- visibility through Row Level Security;
- immutability guarantees.

### 4. Reset and verify

```shell
pnpm db:verify
```

### 5. Regenerate application types

The verification command already checks generated types, but they can also be
generated independently:

```shell
pnpm db:types
```

## Database design rules

### Immutable history

Mutable domain concepts are modeled as stable identities plus append-only
versions or events wherever practical.

Current-state tables are projections or heads over immutable history.

Application code must not update append-only history tables directly.

### Command functions

Complex aggregate writes are exposed through PostgreSQL functions.

Command functions are responsible for:

- validating the authenticated actor;
- checking aggregate state;
- enforcing authorization;
- appending immutable history;
- advancing current projections atomically;
- returning stable identifiers or result rows.

Clients should call command functions instead of reproducing multi-table write
transactions.

### Row Level Security

Row Level Security is part of the authorization model.

Policies must be tested for at least:

- an authorized owner;
- an ordinary member;
- an unrelated authenticated user;
- unauthenticated access where relevant.

Application-side checks may improve user experience, but they do not replace
database authorization.

### Generated types

Generated database types are infrastructure contracts.

They may be used by Supabase infrastructure adapters but must not leak into the
domain or application layers.

## Local development users

The seed creates the following local-only users:

| Role             | Email                     | Password       |
| ---------------- | ------------------------- | -------------- |
| Workspace owner  | `owner@chat-hub.local`    | `Password123!` |
| Workspace member | `member@chat-hub.local`   | `Password123!` |
| Outsider         | `outsider@chat-hub.local` | `Password123!` |

These credentials are intended only for the local development stack.

Do not reuse them in hosted, shared, staging, or production environments.

## Auth seed requirements

The local development users are inserted directly into `auth.users` to preserve
stable UUIDs.

This approach depends on Supabase Auth's internal database representation and
must remain local-only.

Supabase Auth reads several token-related columns as strings. Seeded rows must
therefore initialize these fields to empty strings rather than `NULL`:

```text
confirmation_token
recovery_token
email_change_token_new
email_change
phone_change
phone_change_token
reauthentication_token
```

The relevant part of each seeded user must explicitly provide values such as:

```sql
'',
'',
'',
'',
'',
'',
''
```

Do not rely on nullable defaults for these columns.

Production users must be provisioned through Supabase Auth APIs rather than
through direct inserts into `auth.users`.

## Troubleshooting local authentication

### `Database error querying schema`

A successful CORS preflight followed by this response:

```json
{
  "code": "unexpected_failure",
  "message": "Database error querying schema"
}
```

means the browser reached Supabase Auth, but Auth could not read or update its
database state.

This is not normally an Angular networking failure.

Inspect the Auth container logs:

```shell
docker logs supabase_auth_chat-hub-99 --tail 200
```

Follow the logs while reproducing the failure:

```shell
docker logs --follow supabase_auth_chat-hub-99
```

List all local project containers when a container name is uncertain:

```powershell
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" |
    Select-String "chat-hub-99"
```

The PostgreSQL container is normally named with `supabase_db`:

```shell
docker logs supabase_db_chat-hub-99 --tail 200
```

Follow the database logs with:

```shell
docker logs --follow supabase_db_chat-hub-99
```

### `converting NULL to string is unsupported`

An Auth log such as:

```text
error finding user: sql: Scan error on column index 3,
name "confirmation_token": converting NULL to string is unsupported
```

means a row inserted directly into `auth.users` contains `NULL` in a field that
Supabase Auth expects to scan as a string.

Inspect the seeded users:

```sql
SELECT
    email,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change,
    phone_change_token,
    reauthentication_token
FROM auth.users
WHERE email LIKE '%@chat-hub.local'
ORDER BY email;
```

The Auth string-token columns must contain empty strings rather than `NULL`.

For temporary diagnosis of an already-running local database:

```sql
UPDATE auth.users
SET
    confirmation_token =
        COALESCE(confirmation_token, ''),
    recovery_token =
        COALESCE(recovery_token, ''),
    email_change_token_new =
        COALESCE(email_change_token_new, ''),
    email_change =
        COALESCE(email_change, ''),
    phone_change =
        COALESCE(phone_change, ''),
    phone_change_token =
        COALESCE(phone_change_token, ''),
    reauthentication_token =
        COALESCE(reauthentication_token, '')
WHERE email LIKE '%@chat-hub.local';
```

This update repairs only the currently running local database.

The permanent correction must be made in `supabase/seed.sql`, because the next
database reset recreates the users from the seed:

```shell
pnpm db:reset
```

After updating the seed, verify it from a clean database:

```shell
pnpm db:verify
```

A useful verification query is:

```sql
SELECT
    email,
    confirmation_token IS NULL
        AS confirmation_token_is_null,
    recovery_token IS NULL
        AS recovery_token_is_null,
    email_change_token_new IS NULL
        AS email_change_token_new_is_null,
    email_change IS NULL
        AS email_change_is_null,
    phone_change IS NULL
        AS phone_change_is_null,
    phone_change_token IS NULL
        AS phone_change_token_is_null,
    reauthentication_token IS NULL
        AS reauthentication_token_is_null
FROM auth.users
WHERE email LIKE '%@chat-hub.local'
ORDER BY email;
```

Every Boolean result should be `false`.

### Informational forwarded-host message

The following Auth log is informational:

```text
Request received external host in X-Forwarded-Host or Host headers,
but the values have not been added to GOTRUE_MAILER_EXTERNAL_HOSTS...
```

It is unrelated to password validation and did not cause the database query
failure described above.

### No authentication request appears

Open browser developer tools and inspect the Network panel.

Expected password sign-in flow:

```text
OPTIONS /auth/v1/token?grant_type=password
POST    /auth/v1/token?grant_type=password
```

If no `POST` request appears, inspect the Angular component, authentication
store, application execution boundary, and Supabase client configuration.

### Connection refused

Confirm that the local stack is running:

```shell
pnpm supabase:status
```

The API URL should normally be:

```text
http://127.0.0.1:54321
```

If necessary:

```shell
pnpm supabase:start
```

### Invalid local API key

Compare the key used by the Angular development environment with the key printed
by:

```shell
pnpm supabase:status
```

Restart the Angular development server after changing environment
configuration.

### Seeded user is missing

Inspect the Auth users:

```sql
SELECT
    id,
    email,
    email_confirmed_at
FROM auth.users
WHERE email LIKE '%@chat-hub.local'
ORDER BY email;
```

If the expected users are absent, perform a clean reset:

```shell
pnpm db:reset
```

Then inspect the seed output for failures.

## Database container access

List local containers:

```powershell
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" |
    Select-String "chat-hub-99"
```

Typical container names include:

```text
supabase_auth_chat-hub-99
supabase_db_chat-hub-99
supabase_studio_chat-hub-99
```

Container names may differ when the project identifier changes. Prefer listing
the active containers before assuming a name.

## Logging and sensitive data

Database and authentication diagnostics may contain operational details.

Do not place the following values in committed logs, screenshots, issues, or
documentation:

- passwords;
- access tokens;
- refresh tokens;
- complete Supabase session objects;
- service-role keys;
- database passwords;
- hosted environment secrets.

Local publishable keys are designed for client use, but they should still be
read from configuration rather than copied unnecessarily into diagnostic
material.

## Clean local recovery

When the local stack is in an uncertain state:

```shell
pnpm supabase:stop
pnpm supabase:start
pnpm db:verify
```

For normal application development:

```shell
pnpm dev
```

This prepares the local database and starts the Angular client.
