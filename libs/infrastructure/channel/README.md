# Channel infrastructure

## Purpose

Implements channel discovery, creation, and detail updates with Supabase while
keeping generated database types and provider failures outside the application
boundary.

## Responsibilities and non-responsibilities

- Query active channels in stable order through the RLS-protected
  `current_channels` view.
- Execute the transactional `create_channel` RPC.
- Execute the transactional `update_channel` RPC.
- Map validated application commands to generated RPC arguments.
- Decode external rows and validate returned channel/version UUIDs.
- Translate provider failures into application-owned errors.
- Supply `ChannelRepository` through an Effect Layer.

This library does not own input normalization, Angular state, route selection,
or authorization policy. PostgreSQL remains the enforcement boundary for
active-workspace membership and ownership.

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

Updates send only the stable channel identity, name, and description. The RPC
keeps workspace association and slug immutable, verifies active workspace
ownership, appends a version, and returns that version UUID. The adapter
validates the UUID and acknowledges success as `void`; database version
identities do not cross the application boundary.

PostgreSQL code `23505` is translated to a slug conflict only when the RPC's
channel-slug message is also present; unrelated uniqueness failures remain
repository-unavailable errors. Code `42501` becomes the stable creation-not-
allowed error. Stable update authorization and archived-lifecycle rejections
become `ChannelUpdateNotAllowedError`; unrelated provider failures remain
repository-unavailable. Raw PostgREST values never escape this library.

## Runtime flow

```text
createChannel use case
  -> ChannelRepositoryTag
  -> SupabaseChannelRepositoryLayer
  -> create_channel RPC (authenticated session + membership authorization)
  -> ChannelIdSchema decoding
  -> application Channel value

updateChannel use case
  -> ChannelRepositoryTag
  -> SupabaseChannelRepositoryLayer
  -> update_channel RPC (authenticated session + owner authorization)
  -> version UUID validation
  -> void repository acknowledgment
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
