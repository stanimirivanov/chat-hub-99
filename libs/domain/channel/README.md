# Channel domain

## Purpose

Owns channel identity and the validated channel projection used for navigation.

## Boundary

This library contains no Angular, Supabase, database-generated, or application
workflow code. It may depend only on domain or utility libraries. The workspace
identifier is imported from the workspace domain because a channel belongs to a
workspace; message code imports `ChannelId` from this package because identity
is owned here.

## Public API

- `ChannelIdSchema` and `ChannelId`
- `ChannelNameSchema`
- `ChannelSlugSchema`
- `ChannelSchema` and `Channel`

`ChannelSchema` validates unknown adapter data at runtime. Required identifiers
must be UUIDs, names must not be blank, slugs use lowercase kebab case, and
descriptions may be `null`.

## Extension

Add channel invariants here only when they are meaningful without persistence
or UI technology. Keep commands, authorization queries, and selection state in
their owning outer layers.

## Verification

```text
nx lint channel-domain
nx run channel-domain:typecheck
nx run channel-domain:typecheck:test
nx test channel-domain
```
