# Profile application

## Purpose

Defines the technology-independent workflow and outbound port for loading the
authenticated user’s current profile projection.

## Responsibilities and boundary

- `getCurrentProfile` validates unknown boundary input and orchestrates lookup.
- `ProfileRepository` defines current-profile discovery.
- Tagged errors represent invalid input, missing projections, provider
  unavailability, and malformed external data.

The library does not query Supabase, run Effects, or own Angular state. It
depends only on application, domain, and utility libraries.

## Runtime flow

```text
caller -> getCurrentProfile -> ProfileRepositoryTag
       -> supplied repository -> validated Profile
```

The Tag is the typed service key requested by the lazy Effect. An outer Layer
supplies its implementation before the Angular runtime executes the program.

## Extension

Add repository operations only for implemented profile use cases. Profile
editing should remain a separate command slice.

## Verification

```text
nx lint profile-application
nx run profile-application:typecheck
nx run profile-application:typecheck:test
nx test profile-application
```
