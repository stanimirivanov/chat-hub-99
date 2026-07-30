# Channel infrastructure

## Purpose

Implements workspace-scoped channel discovery with the RLS-protected Supabase
`current_channels` view.

## Responsibilities

- Query active channels for exactly one selected workspace.
- Apply stable name and identity ordering.
- Decode generated nullable view rows into channel domain values.
- Translate provider and validation failures into application errors.
- Supply `ChannelRepository` through an Effect Layer.

Generated database types and Supabase query details stop at this boundary.

## Runtime flow

```text
listWorkspaceChannels use case
  -> ChannelRepositoryTag
  -> SupabaseChannelRepositoryLayer
  -> current_channels view + RLS
  -> ChannelSchema decoding
```

A Tag is the typed key through which the application requests a capability. A
Layer is the construction recipe that supplies the concrete repository from the
configured Supabase client.

## Public API

- `SupabaseChannelClientTag` and `SupabaseChannelClient`
- `SupabaseChannelRepositoryLayer`

## Extension

Keep new channel queries and mappings private unless runtime composition needs
them. Add repository capabilities only after an application use case requires
them.

## Verification

```text
nx lint channel-infrastructure
nx run channel-infrastructure:typecheck
nx run channel-infrastructure:typecheck:test
nx test channel-infrastructure
```
