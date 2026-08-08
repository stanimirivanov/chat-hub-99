# Channel infrastructure

## Purpose

Implements active and archived channel discovery, realtime invalidation,
creation, detail updates, archiving, and restoration with Supabase while
keeping generated database types and provider failures outside the application
boundary.

## Responsibilities and non-responsibilities

- Query active channels in stable order through the RLS-protected
  `current_channels` view.
- Query archived channels newest first through the same RLS-protected view.
- Observe payload-minimal private Broadcast invalidations for one workspace.
- Execute the transactional `create_channel` RPC.
- Execute the transactional `update_channel` RPC.
- Execute the transactional `archive_channel` RPC.
- Execute the transactional `restore_channel` RPC.
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
realtime/    private workspace-channel invalidation stream
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

Archiving sends only the stable channel identity. The RPC verifies active
workspace ownership and changes the mutable channel head status without
deleting the channel, messages, or history. Its `void` success remains a `void`
repository acknowledgment; no inactive channel projection is manufactured.

Restoration also sends only the stable channel identity. It locks the archived
channel and active workspace, verifies active ownership, and changes only the
mutable lifecycle head. Descriptive history is not duplicated. The command
returns the now-active `current_channels` projection, which the adapter checks
for the requested identity and active status before domain decoding.

Archived discovery reads `current_channels.updated_at` as the archive time
because the archive command updates the mutable head timestamp in the same
transaction. Existing row-level security exposes archived rows only to active
workspace owners and excludes archived workspaces; the adapter does not repeat
that policy in TypeScript. Rows are decoded into the distinct
`ArchivedChannel` projection before crossing the infrastructure boundary.

Realtime uses one private `workspace-channels:<workspace-id>` Broadcast topic.
PostgreSQL authorizes receipt from active membership, while the adapter treats
every event only as an invalidation and reuses the ordinary active-channel
query. The stream emits once after subscription readiness to close the
query-before-listen race and removes its Supabase channel when interrupted.

PostgreSQL code `23505` is translated to a slug conflict only when the RPC's
channel-slug message is also present; unrelated uniqueness failures remain
repository-unavailable errors. Code `42501` becomes the stable creation-not-
allowed error. Stable update authorization and archived-lifecycle rejections
become `ChannelUpdateNotAllowedError`; unrelated provider failures remain
repository-unavailable. Archive authorization and stable archived-lifecycle
failures receive the parallel `ChannelArchiveNotAllowedError` translation.
Restoration authorization, non-archived lifecycle, and archived-workspace
failures become `ChannelRestoreNotAllowedError`. Raw PostgREST values never
escape this library.

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

archiveChannel use case
  -> ChannelRepositoryTag
  -> SupabaseChannelRepositoryLayer
  -> archive_channel RPC (authenticated session + owner authorization)
  -> void repository acknowledgment

restoreChannel use case
  -> ChannelRepositoryTag
  -> SupabaseChannelRepositoryLayer
  -> restore_channel RPC (authenticated session + owner authorization)
  -> matching active projection validation
  -> application Channel value

listArchivedWorkspaceChannels use case
  -> ChannelRepositoryTag
  -> SupabaseChannelRepositoryLayer
  -> current_channels archived rows (owner-only RLS visibility)
  -> validated ArchivedChannel collection, newest first

observeWorkspaceChannels stream
  -> changesByWorkspace private invalidations
  -> listByWorkspace RLS-protected snapshots
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
