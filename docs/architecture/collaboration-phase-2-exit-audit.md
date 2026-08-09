# Collaboration Phase 2 Exit Audit

> **Document ID:** OMO-ARC-002  
> **Status:** Exit audit  
> **Audited:** 9 August 2026

## Purpose

This audit evaluates the implemented collaboration baseline against the Phase 2
scope and exit criteria in OMO-RMP-001. It does not expand the product scope or
design the Phase 3 server.

## Verdict

The required Phase 2 collaboration capabilities and architectural boundaries
are implemented. Phase 2 is not yet formally closed because the repository has
no executable browser end-to-end smoke test. The remaining work is one
closeout-quality slice, not another collaboration feature.

Phase 3 application-server work should begin only after that smoke test proves
the existing browser-to-Supabase collaboration path from a clean local
environment.

## Implementation-scope evidence

| Roadmap requirement                                                      | Result | Repository evidence                                                                                                                                                                                                |
| ------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Audit the collaboration architecture                                     | Met    | OMO-ARC-001 records capability, dependency, state, authorization, realtime, pagination, and failure ownership.                                                                                                     |
| Add workspace presence and channel typing                                | Met    | Capability-specific application and infrastructure services, Angular stores/components, private-topic authorization, and database tests are present.                                                               |
| Add workspace message search                                             | Met    | The message application port, Supabase RPC adapter, exact-result navigation, fixed result cap, and RLS-preserving database tests are present.                                                                      |
| Add persisted read positions, unread counts, and realtime reconciliation | Met    | Monotonic read-position commands, authoritative count snapshots, private invalidation topics, stale-result protection, and database/application/infrastructure/client tests are present.                           |
| Preserve collaboration invariants                                        | Met    | PostgreSQL constraints and RLS own authorization and lifecycle rules; domain decoding, application ports, infrastructure mapping, stable cursors, and archived projections preserve boundaries above the database. |
| Finish affected API and architectural documentation                      | Met    | Domain, application, infrastructure, client-state, migration, and architecture documentation describe the implemented behavior and non-obvious runtime ownership.                                                  |

Optional reactions, threads, attachments, notification delivery, invitation
delivery, and avatar uploads remain outside the Phase 2 exit boundary.

## Exit-criteria evaluation

### Authorized collaboration source data

**Met.** Persisted messages retain stable identities, immutable revision
history, author and channel ownership, lifecycle state, and deterministic
ordering. Workspace-scoped search returns only active RLS-visible source
messages and exact navigation resolves the same authorized projection. These
properties are sufficient for a later server-side Analysis Run to reference
collaboration evidence without redefining collaboration authorization.

This verdict does not authorize an AI provider, privileged server access, or a
new Analysis Run schema. Those belong to later phases.

### Direct browser collaboration boundary

**Met.** Ordinary authentication, profile, workspace, membership, invitation,
channel, message, presence, typing, search, and unread operations execute from
the Angular client through provider-independent application contracts and
Supabase adapters. No application server is required for those operations.

### End-to-end verification

**Not met.** The repository verifies behavior at each owning layer:

- domain schema tests;
- application orchestration and typed-failure tests;
- Supabase adapter, mapping, Layer, and type tests;
- Angular Signal Store and component tests;
- PostgreSQL constraint, command, RLS, search, and realtime pgTAP tests;
- repository-wide format, synchronization, lint, typecheck, test, build, and
  clean-database gates.

However, there is no Nx end-to-end project and no Playwright, Cypress, or
equivalent browser smoke test. The existing suites do not launch the real
Angular application against the local Supabase stack and drive one complete
authenticated collaboration path. Layer coverage must not be described as a
browser end-to-end result.

## Required closeout slice

Add one deterministic browser smoke path with the smallest useful scope:

1. start from the documented local Supabase reset and seed;
2. launch the Angular client using its local environment;
3. sign in through the rendered authentication form as a seeded user;
4. resolve and open an authorized seeded workspace and channel;
5. create a uniquely identifiable message through the rendered composer and
   observe it in message history;
6. sign out and confirm anonymous application entry;
7. expose one documented local command and run it in CI after the local
   platform is ready.

The slice should retain browser failure artifacts useful in CI and must not add
a generic test framework around one smoke path. Multi-browser coverage,
visual-regression testing, performance testing, and realtime multi-session
scenarios are later improvements unless the first test exposes a concrete need.

## Phase 3 entry condition

After the browser smoke passes from a clean clone locally and in CI:

- mark Phase 2 complete in OMO-RMP-001;
- preserve OMO-ARC-001 as the implemented collaboration architecture;
- use this audit as the evidence that the existing direct-to-Supabase path must
  remain unchanged when `apps/server` is introduced;
- proceed to the required Phase 3 architecture decisions and the first modular
  server vertical slice.

## Reproducible verification

The audit uses the repository's existing public gates:

```bash
pnpm verify
pnpm db:verify
```

Passing these commands is necessary but does not satisfy the missing browser
smoke criterion by itself.

At the audit revision, both gates pass. The database gate recreates the schema
and seed from scratch, reports no schema-lint errors, passes all 407 assertions
across 25 pgTAP files, and regenerates the public database types without a
diff.
