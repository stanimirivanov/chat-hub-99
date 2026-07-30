# Profile infrastructure

## Purpose

Implements current-profile discovery with the RLS-protected Supabase
`current_profiles` view.

## Responsibilities

- Query one profile by stable authenticated-user identity.
- Decode generated nullable view data into a profile domain projection.
- Preserve missing rows as absence for application policy.
- Translate provider and validation failures into application errors.
- Supply `ProfileRepository` through an Effect Layer.

Generated database types and Supabase query details stop at this boundary.

## Runtime flow

```text
getCurrentProfile use case
  -> ProfileRepositoryTag
  -> SupabaseProfileRepositoryLayer
  -> current_profiles view + RLS
  -> ProfileSchema decoding
```

A Tag is the typed key through which the application requests a capability. A
Layer constructs and supplies that capability from the configured Supabase
client.

## Public API

- `SupabaseProfileClientTag` and `SupabaseProfileClient`
- `SupabaseProfileRepositoryLayer`

## Verification

```text
nx lint profile-infrastructure
nx run profile-infrastructure:typecheck
nx run profile-infrastructure:typecheck:test
nx test profile-infrastructure
```
