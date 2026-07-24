# Chat Hub

Slack-inspired collaboration platform built with

- Angular
- Signals
- NgRx Signal Store
- Supabase
- PostgreSQL
- Nx

## Requirements

- Node
- pnpm

## Install

pnpm install

## Start

pnpm start

## Test

pnpm test

## Build

pnpm build

## Local Supabase

This project uses the Supabase CLI for local development.

### Prerequisites

- Docker Desktop
- Node.js
- pnpm

### Start

```bash
pnpm supabase start
```

### Stop

```bash
pnpm supabase stop
```

### Status

```bash
pnpm supabase status
```

The first startup downloads the required Docker images and may take several
minutes.

### Database workflow

Create a migration:

```bash
pnpm db:migration:new <migration-name>
```

Rebuild the local database from migrations and seed data:

```bash
pnpm db:reset
```

Regenerate TypeScript database types:

```bash
pnpm db:types
```

Database schema changes must be committed as files under `supabase/migrations`.
Do not make untracked schema changes directly in the local database.

## Documentation

See the project wiki.
