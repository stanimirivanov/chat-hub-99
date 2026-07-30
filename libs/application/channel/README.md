# Channel application

## Purpose

Defines the technology-independent workflow and outbound port for listing the
active channels of a selected workspace.

## Responsibilities

- `listWorkspaceChannels` orchestrates workspace-scoped discovery.
- `ChannelRepository` defines the capability required by that use case.
- Tagged errors describe unavailable providers and invalid external data.

This library does not query Supabase, run Effects, or own Angular selection
state. It depends only on application, domain, and utility libraries.

## Runtime flow

```text
caller -> listWorkspaceChannels -> ChannelRepositoryTag
       -> supplied repository -> validated Channel values
```

In Effect, the Tag is a typed key used to request the repository. The exported
use case builds a lazy Effect whose success, error, and required-service
channels remain visible until an outer runtime supplies and executes it.

## Extension

Add a repository operation only when a channel use case needs the capability.
Keep Supabase filters and row shapes in infrastructure.

## Verification

```text
nx lint channel-application
nx run channel-application:typecheck
nx run channel-application:typecheck:test
nx test channel-application
```
