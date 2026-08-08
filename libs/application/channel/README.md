# Channel application

## Purpose

Defines technology-independent workflows and the outbound port for discovering
and mutating workspace channels.

## Responsibilities and non-responsibilities

- `listWorkspaceChannels` orchestrates workspace-scoped discovery.
- `listArchivedWorkspaceChannels` discovers the archived channels still visible
  to the current session through persistence authorization.
- `observeWorkspaceChannels` converts scoped invalidations into authoritative
  active-channel snapshots through the ordinary repository read.
- `createChannel` normalizes and validates untrusted creation input.
- `updateChannel` normalizes and validates mutable channel details while
  excluding the immutable workspace association and slug.
- `archiveChannel` validates a stable channel identity and acknowledges the
  inactive transition without producing an active projection.
- `restoreChannel` validates a stable channel identity and returns the restored
  active projection.
- `ChannelRepository` defines only the scoped observation, read, create,
  update, archive, restore, and archived-discovery capabilities required by
  those use cases.
- Tagged errors distinguish invalid input, unavailable providers, invalid
  external data, slug conflicts, and authorization failures.

This library does not query Supabase, run Effects, inspect sessions, own Angular
state, authorization policy, or hard deletion. It depends only on domain and
Effect contracts.

## Structure

```text
archive-channel/            archive workflow, input, and errors
create-channel/             creation workflow, input, and errors
channel-details/            shared mutable-detail decoding
channel-identity/           shared command identity decoding
list-archived-workspace-channels/ archived discovery workflow
list-workspace-channels/    workspace-scoped discovery workflow
observe-workspace-channels/ validated realtime snapshot workflow
repository/                 outbound port and technology-neutral failures
restore-channel/            restoration workflow, input, and errors
testing/                    isolated repository Layers and fixtures
update-channel/             update workflow, input, result, and errors
```

## Public API

- `createChannel` and its input/error contracts
- `updateChannel` and its input/result/error contracts
- `archiveChannel` and its input/error contracts
- `restoreChannel` and its input/error contracts
- `listArchivedWorkspaceChannels`
- `listWorkspaceChannels`
- `observeWorkspaceChannels` and its input/error contracts
- `ChannelRepositoryTag`, `ChannelRepository`, and command contracts
- channel repository read/create/update/archive/restore errors

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

Archiving returns `void` throughout the application boundary because the
database command returns no projection and archived channels must not be
represented as active `Channel` values. The shared channel-ID decoder exists
only because update and archive now enforce the same unknown-input boundary.

Archived discovery returns the separate `ArchivedChannel` projection.
Restoration accepts only the stable identity and returns a repository-validated
active `Channel`; application code neither trusts the archived presentation
value as the command result nor owns the authorization decision. Hard deletion
remains outside this lifecycle.

## Runtime flow

```text
Angular caller -> createChannel -> validate and normalize input
               -> ChannelRepositoryTag -> repository.create
               -> provider-issued ChannelId -> validated Channel

Angular caller -> updateChannel -> validate identity, name, and description
               -> ChannelRepositoryTag -> repository.update
               -> validated provider acknowledgment
               -> normalized UpdatedChannelDetails

Angular caller -> archiveChannel -> validate channel identity
               -> ChannelRepositoryTag -> repository.archive
               -> void acknowledgment

Angular caller -> listArchivedWorkspaceChannels -> ChannelRepositoryTag
               -> repository.listArchivedByWorkspace
               -> readonly ArchivedChannel collection

Angular caller -> restoreChannel -> validate channel identity
               -> ChannelRepositoryTag -> repository.restore
               -> validated active Channel

Angular caller -> observeWorkspaceChannels -> validate workspace identity
               -> repository.changesByWorkspace invalidations
               -> repository.listByWorkspace authoritative snapshots
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
