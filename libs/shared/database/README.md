# Shared Database Types

`@omoikane/shared/database` contains compile-time descriptions of the Supabase schema and small aliases derived from those generated types.

## Responsibilities

- Check in generated Supabase `Database` types
- Expose table, view, and RPC argument/result aliases
- Centralize database names needed by infrastructure code

## What this library is not

It is not the domain model. Generated types describe nullable columns, views, RPC signatures, and storage representation. They do not enforce business invariants at runtime. Infrastructure must map and validate these values before returning domain objects.

## Dependency rule

Only infrastructure and database tooling should normally depend on this package. Domain and application libraries must remain independent of the physical schema.

```text
shared/database ──> infrastructure adapters
```

## Generated code

`src/generated/database.types.ts` is produced from the local Supabase schema. Do not hand-edit it.

Regenerate and verify it with:

```bash
pnpm db:types
pnpm db:types:check
```

Derived aliases under `src/lib` should remain thin. Business behavior belongs in domain or application packages, not in database type helpers.

The production typecheck excludes `*.type-test.ts`; the separate test
typecheck compiles those contract assertions through `tsconfig.spec.json`.
