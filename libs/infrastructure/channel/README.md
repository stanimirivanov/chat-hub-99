# Channel infrastructure

## Purpose

Implements channel discovery and creation with Supabase while keeping generated
database types and provider failures outside the application boundary.

## Responsibilities and non-responsibilities

- Query active channels in stable order through the RLS-protected
  `current_channels` view.
- Execute the transactional `create_channel` RPC.
- Map validated application commands to generated RPC arguments.
- Decode external rows and the returned channel UUID with domain schemas.
- Translate provider failures into application-owned errors.
- Supply `ChannelRepository` through an Effect Layer.

This library does not own input normalization, Angular state, route selection,
or authorization policy. PostgreSQL remains the enforcement boundary for
active-workspace membership.

## Structure

```text
commands/    Supabase channel mutations
queries/     RLS-visible channel reads
mapping/     database-to-domain and command-to-RPC mapping
errors/      PostgREST-to-application error translation
testing/     focused Supabase client stubs and fixtures
```

## Public API

- `SupabaseChannelClientTag` and `SupabaseChannelClient`
- `SupabaseChannelRepositoryLayer`

Command, query, and mapping modules remain private adapter details.

## Design decisions

Creation sends no actor identifier. The security-definer RPC obtains
`auth.uid()` and verifies active workspace membership inside the transaction.
Its UUID result is runtime-decoded before crossing into application code.

PostgreSQL code `23505` is translated to a slug conflict only when the RPC's
channel-slug message is also present; unrelated uniqueness failures remain
repository-unavailable errors. Code `42501` becomes the stable creation-not-
allowed error. Raw PostgREST values never escape this library.

## Runtime flow

```text
createChannel use case
  -> ChannelRepositoryTag
  -> SupabaseChannelRepositoryLayer
  -> create_channel RPC (authenticated session + membership authorization)
  -> ChannelIdSchema decoding
  -> application Channel value
```

A Tag is the typed key through which application code requests a capability. A
Layer is the construction recipe that supplies the concrete repository from the
configured Supabase client. The Angular composition root provides that shared
client dependency before any Effect is run.

## Extension

Keep new channel queries and mappings private unless runtime composition needs
them. Add repository capabilities only after an application use case requires
them, and translate every new provider failure before it crosses the adapter
boundary.

## Verification

```text
nx lint channel-infrastructure
nx run channel-infrastructure:typecheck
nx run channel-infrastructure:typecheck:test
nx test channel-infrastructure
```
