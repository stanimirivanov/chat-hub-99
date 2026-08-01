# Channel application

## Purpose

Defines technology-independent workflows and the outbound port for discovering
and mutating workspace channels.

## Responsibilities and non-responsibilities

- `listWorkspaceChannels` orchestrates workspace-scoped discovery.
- `createChannel` normalizes and validates untrusted creation input.
- `updateChannel` normalizes and validates mutable channel details while
  excluding the immutable workspace association and slug.
- `ChannelRepository` defines only the read, create, and update capabilities
  required by those use cases.
- Tagged errors distinguish invalid input, unavailable providers, invalid
  external data, slug conflicts, and authorization failures.

This library does not query Supabase, run Effects, inspect sessions, or own
Angular state. It depends only on domain and Effect contracts.

## Structure

```text
create-channel/             creation workflow, input, and errors
channel-details/            shared mutable-detail decoding
list-workspace-channels/    workspace-scoped discovery workflow
repository/                 outbound port and technology-neutral failures
testing/                    isolated repository Layers and fixtures
update-channel/             update workflow, input, result, and errors
```

## Public API

- `createChannel` and its input/error contracts
- `updateChannel` and its input/result/error contracts
- `listWorkspaceChannels`
- `ChannelRepositoryTag`, `ChannelRepository`, and command contracts
- channel repository read/create/update errors

## Design decisions

Actor identity is not accepted from callers. The repository implementation must
derive it from the authenticated provider session, preventing presentation code
from choosing an actor or bypassing membership authorization.

The creation RPC returns a database-issued channel UUID. After the repository
validates that identity, the use case combines it with the already validated and
normalized command to produce the channel projection. This avoids adding a
second query or a `findById` port that no implemented use case otherwise needs.

Channel updates follow the same acknowledgment model. The database returns the
new immutable version UUID, which infrastructure validates without exposing it.
The use case returns its normalized channel identity, name, and description so
the caller can reconcile those mutable fields with its already validated
workspace and slug projection. Actor identity is absent from both commands.

## Runtime flow

```text
Angular caller -> createChannel -> validate and normalize input
               -> ChannelRepositoryTag -> repository.create
               -> provider-issued ChannelId -> validated Channel

Angular caller -> updateChannel -> validate identity, name, and description
               -> ChannelRepositoryTag -> repository.update
               -> validated provider acknowledgment
               -> normalized UpdatedChannelDetails
```

In Effect, a Tag is the typed key used to request the repository. The use cases
build lazy Effects whose success, failure, and required-service channels remain
visible until the Angular runtime supplies and executes them. `Effect.gen`
sequences validation and repository access while preserving those typed
channels.

## Extension

Add a repository operation only when an implemented channel use case needs it.
Keep database arguments, authorization details, and row shapes in
infrastructure. Keep form state and URL selection in the Angular feature.

## Verification

```text
nx lint channel-application
nx run channel-application:typecheck
nx run channel-application:typecheck:test
nx test channel-application
```
