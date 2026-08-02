# Profile application

## Purpose

Defines technology-independent workflows and the outbound port for loading
RLS-visible current profile projections and updating the authenticated user's
profile.

## Responsibilities and boundary

- `getCurrentProfile` validates unknown boundary input and orchestrates one
  required profile lookup.
- `updateCurrentProfile` normalizes editable values and coordinates the
  self-service update, including decoding optional HTTPS avatar URLs.
- `listCurrentProfiles` validates and deduplicates an identity collection for
  batched discovery.
- `ProfileRepository` defines single and batched discovery, exact active
  username lookup, and self-service update operations.
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

workspace member addition -> ProfileRepositoryTag.findActiveByUsername
                          -> active Profile or absence
```

The Tag is the typed service key requested by the lazy Effect. An outer Layer
supplies its implementation before the Angular runtime executes the program.

The batch use case returns the visible subset rather than treating missing
profiles as an error: RLS or lifecycle state may legitimately hide an author
profile while the associated message remains readable.

Blank avatar input is normalized to absence. Non-blank input is decoded with
the profile domain's `AvatarUrlSchema` before the repository is requested, so
the command port carries only validated avatar values while PostgreSQL remains
the final integrity boundary.

Exact username lookup is a profile capability consumed by the workspace
application workflow. Keeping lookup behind the profile port prevents the
workspace repository from learning how profiles are stored or queried.

## Extension

Add repository operations only for implemented profile use cases.
Administrative lifecycle changes remain outside the self-service update
contract.

## Verification

```text
nx lint profile-application
nx run profile-application:typecheck
nx run profile-application:typecheck:test
nx test profile-application
```
