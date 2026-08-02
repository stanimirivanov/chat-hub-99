# Profile domain

## Purpose

Owns stable profile identity and the validated current-profile projection used
by authenticated presentation.

## Boundary and public API

The public API consists of the profile identity, avatar URL, and current-profile
schemas and their corresponding types. The library has no Angular, Supabase,
generated database, or application dependency. It may depend only on domain or
utility libraries.

The schema validates unknown adapter data at runtime. Usernames are optional,
display names are non-blank, and lifecycle status is explicit. An avatar is
either absent or a trimmed, credential-free HTTPS URL of at most 2,048
characters. The branded `AvatarUrl` remains a string value so the domain does
not require browser or Node URL globals.

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
