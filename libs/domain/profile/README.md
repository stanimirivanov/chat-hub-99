# Profile domain

## Purpose

Owns stable profile identity and the validated current-profile projection used
by authenticated presentation.

## Boundary and public API

The public API consists of `ProfileIdSchema`, `ProfileId`, `ProfileSchema`, and
`Profile`. The library has no Angular, Supabase, generated database, or
application dependency. It may depend only on domain or utility libraries.

The schema validates unknown adapter data at runtime. Usernames are optional,
display names are non-blank, and lifecycle status is explicit. Avatar values
remain non-blank opaque strings because the database contract currently
normalizes absence but imposes no URL-format rule.

## Extension

Add profile invariants here only when they remain meaningful without
persistence or UI technology. Profile editing workflows and provider mapping
belong to outer layers.

## Verification

```text
nx lint profile-domain
nx run profile-domain:typecheck
nx run profile-domain:typecheck:test
nx test profile-domain
```
