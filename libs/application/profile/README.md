# Profile application

## Purpose

Defines technology-independent workflows and the outbound port for loading and
updating the authenticated user's current profile projection.
Defines technology-independent workflows and the outbound port for loading
RLS-visible current profile projections.

## Responsibilities and boundary

- `getCurrentProfile` validates unknown boundary input and orchestrates lookup.
- `updateCurrentProfile` normalizes editable values and coordinates the
  self-service update.
- `ProfileRepository` defines current-profile discovery and update operations.
- `getCurrentProfile` validates unknown boundary input and orchestrates one
  required profile lookup.
- `listCurrentProfiles` validates and deduplicates an identity collection for
  batched discovery.
- `ProfileRepository` defines single and batched current-profile discovery.
- Tagged errors represent invalid input, missing projections, provider
  unavailability, malformed external data, and username conflicts.

The library does not query Supabase, run Effects, or own Angular state. It
depends only on domain and utility libraries.

## Runtime flow

```text
caller -> profile use case -> ProfileRepositoryTag
       -> supplied repository -> validated Profile

message feature -> listCurrentProfiles -> ProfileRepositoryTag
                -> supplied repository -> visible Profile[]
```

The Tag is the typed service key requested by the lazy Effect. An outer Layer
supplies its implementation before the Angular runtime executes the program.

The batch use case returns the visible subset rather than treating missing
profiles as an error: RLS or lifecycle state may legitimately hide an author
profile while the associated message remains readable.

## Extension

Add repository operations only for implemented profile use cases.
Administrative lifecycle changes remain outside the self-service update
contract.
Add repository operations only for implemented profile use cases. Profile
editing remains a separate command slice.

## Verification

```text
nx lint profile-application
nx run profile-application:typecheck
nx run profile-application:typecheck:test
nx test profile-application
```
