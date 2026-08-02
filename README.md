# Chat Hub

Chat Hub is an educational, portfolio-oriented collaboration application
inspired by Slack. Its purpose is not only to deliver features, but also to
demonstrate how an Angular application can use domain boundaries, Effect, NgRx
Signal Store, and Supabase without turning those technologies into unnecessary
framework layers.

## Technology

- Angular 22 for the browser application and dependency-injection boundary
- NgRx Signal Store for feature-local presentation state
- Effect for typed application workflows, dependency injection, and failures
- Supabase for authentication, PostgreSQL, row-level security, realtime, and
  storage
- Nx for project boundaries, task orchestration, and dependency visualization
- Vitest for TypeScript unit tests and pgTAP for database tests

## Architectural direction

The codebase follows a layered dependency rule:

```text
Angular presentation
        ↓
Application use cases and ports
        ↓
Domain model

Infrastructure ──implements──> Application ports
Shared database types ───────> Infrastructure only
```

Dependencies point toward policy:

- **Domain** defines validated business values and entities. It has no Angular,
  Supabase, or database dependency.
- **Application** coordinates use cases and declares ports such as
  `MessageRepository`. It depends on the domain, not on Supabase.
- **Infrastructure** implements application ports with Supabase and maps
  database data into domain values.
- **Presentation** adapts Angular events to application calls and stores UI
  state in feature-local Signal Stores.
- **Shared database** contains generated Supabase types and database-specific
  aliases. It is not a domain model.

The project is developed as small vertical slices. New abstractions are
introduced only after concrete duplication or coupling appears in implemented
features.

## Repository layout

```text
apps/client/                    Angular application and presentation features
libs/domain/channel/            Channel identity, navigation projection, and invariants
libs/domain/message/            Message projections, revisions, and invariants
libs/domain/profile/            Profile identity, current projection, and invariants
libs/domain/workspace/          Workspace, membership, and invitation invariants
libs/application/authentication/ Provider-independent authentication workflows
libs/application/channel/       Workspace-scoped channel lifecycle workflows
libs/application/message/       Message lifecycle, history queries, and repository port
libs/application/profile/       Current-profile discovery/update port and use cases
libs/application/workspace/     Workspace lifecycle, membership, and invitation workflows
libs/infrastructure/authentication/ Supabase authentication adapter
libs/infrastructure/channel/    Supabase channel query and command adapter
libs/infrastructure/message/    Supabase implementation of the message repository
libs/infrastructure/profile/    Supabase current-profile query and command adapter
libs/infrastructure/workspace/  Supabase workspace/member/invitation adapter
libs/shared/database/           Generated and derived database types
supabase/                       Migrations, seed data, configuration, and pgTAP tests
tools/database/                 Database type-generation tooling
```

Each library README documents its responsibilities, dependency rules, internal
package structure, and extension guidelines.

## SOLID in this codebase

SOLID is applied pragmatically rather than mechanically:

- **Single responsibility:** database operations, mapping, composition, use
  cases, and presentation state are separate modules.
- **Open/closed:** application code depends on repository ports, allowing
  another adapter without modifying use cases.
- **Liskov substitution:** repository implementations must preserve the port’s
  success and failure semantics.
- **Interface segregation:** ports expose operations required by the message
  application; UI components do not depend on Supabase APIs.
- **Dependency inversion:** Effect service tags connect application policy to
  infrastructure implementations at the runtime composition root.

A separate Nx library is not created for every class or function. A package
boundary is justified only when it provides an independently enforceable
dependency rule or reusable capability.

## Getting started

### Requirements

- Node.js compatible with the version declared by the project tooling
- pnpm 11.16.0
- Docker Desktop for local Supabase

### Install

```bash
pnpm install --frozen-lockfile
```

### Run the client

```bash
pnpm start
```

## Development Workflow

The workspace provides four levels of verification.

### Fast checks

```bash
pnpm check
```

Runs:

- formatting verification
- Nx workspace synchronization verification
- lint
- type checking
- type contract checks

Use this while actively developing.

### Full source verification

```bash
pnpm verify
```

Runs:

- `pnpm check`
- unit tests
- production builds

Run this before committing.

### Database verification

```bash
pnpm db:verify
```

Runs:

- database reset
- migration validation
- pgTAP tests
- generated database type verification

Run this whenever migrations or generated database types change.

Database setup, migrations, seed data, pgTAP tests, and local Supabase
troubleshooting are documented in [`supabase/README.md`](supabase/README.md).

### Complete verification

```bash
pnpm verify:all
```

Runs both source verification and database verification.

This is the recommended command before opening a pull request or merging a major
refactoring.

Checks are intentionally ordered from cheapest to most expensive:

1. format
2. workspace synchronization
3. lint
4. type checking
5. unit tests
6. production build

This allows failures to be detected as early as possible.

## Local Supabase workflow

Start, inspect, and stop the local stack:

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:stop
```

Create a migration and rebuild the database:

```bash
pnpm db:migration:new <migration-name>
pnpm db:reset
```

Regenerate checked-in TypeScript database types:

```bash
pnpm db:types
```

Run the complete database verification pipeline:

```bash
pnpm db:verify
```

`db:verify` resets the database, lints SQL, runs pgTAP tests, regenerates
database types, and checks that generated types are committed.

Database schema changes must be represented by files in `supabase/migrations`.
Avoid manual schema changes that cannot be reproduced from a clean reset.

## Local development data

Prepare a clean local database and start the Angular application:

```bash
pnpm dev
```

This command starts Supabase, resets the local database, applies all migrations,
loads supabase/seed.sql, and starts the Angular development server.

The reset is destructive to local database data.

Seeded users

| Role               | Email                     | Password       |
| :----------------- | :------------------------ | :------------- |
| Workspace owner    | `owner@chat-hub.local`    | `Password123!` |
| Workspace member   | `member@chat-hub.local`   | `Password123!` |
| Workspace outsider | `outsider@chat-hub.local` | `Password123!` |

The owner and member belong to the seeded Chat Hub Development workspace. The
outsider has an active profile but no workspace membership.

These credentials are explicitly local development credentials. Do not place
equivalent fixed passwords in production seed or migration files.

## Architectural note

Direct insertion into `auth.users` couples your local seed to Supabase Auth's
internal schema. Supabase describes Auth identities as separate
authentication-method records associated with users, and that internal
representation may evolve. :contentReference[oaicite:1]{index=1}

For the current educational project, the explicit SQL seed is acceptable
because:

- it is local-only;
- stable UUIDs are important to the deterministic workspace scenario;
- the required Auth fields are now explicit;
- a regression check can detect incompatibility after upgrades.

Do not use the same direct insertion approach as the default production
user-provisioning mechanism. Production users should be created through Supabase
Auth APIs.

After the seed correction and clean reset, the existing Angular and Effect
authentication implementation should no longer return
`AuthenticationUnavailableError` for these credentials.

## Documentation standard

Public types, use cases, ports, adapters, and non-obvious algorithms should have
TSDoc that explains intent and architectural role—not merely restates syntax.
README files explain package boundaries and extension rules. Generated files are
excluded from this requirement.

## Quality benchmark

Future slices should follow [
`docs/architecture/code-quality-benchmark.md`](docs/architecture/code-quality-benchmark.md),
which defines responsibility placement, package-boundary criteria, TSDoc/README
standards, and the review checklist.
