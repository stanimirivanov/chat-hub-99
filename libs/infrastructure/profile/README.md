# Profile infrastructure

## Purpose

Implements current-profile discovery and self-service updates with Supabase.
Implements single and batched current-profile discovery with the RLS-protected
Supabase `current_profiles` view.

## Responsibilities

- Query one profile by stable authenticated-user identity.
- Execute `update_my_profile` without exposing lifecycle-status mutation.
- Query multiple author profiles in one identity-filtered request.
- Decode generated nullable view data into a profile domain projection.
- Decode the RPC result through the same profile domain mapper.
- Preserve missing rows as absence for application policy.
- Translate provider, username-conflict, and validation failures into
  application errors.
- Preserve a missing single row as absence and omit invisible rows from batch
  results.
- Translate provider and validation failures into application errors.
- Supply `ProfileRepository` through an Effect Layer.

Generated database types and Supabase query details stop at this boundary.

## Runtime flow

```text
getCurrentProfile use case
  -> ProfileRepositoryTag
  -> SupabaseProfileRepositoryLayer
  -> current_profiles view or update_my_profile RPC
  -> ProfileSchema decoding

listCurrentProfiles use case
  -> ProfileRepositoryTag
  -> SupabaseProfileRepositoryLayer
  -> one current_profiles `in` query + RLS
  -> ProfileSchema decoding for every returned row
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
