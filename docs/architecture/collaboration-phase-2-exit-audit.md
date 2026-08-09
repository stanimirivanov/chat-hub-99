# Collaboration Phase 2 Exit Audit

> **Document ID:** OMO-ARC-002
>
> **Status:** Phase 2 exit accepted
>
> **Audited:** 9 August 2026

## Purpose

This audit evaluates the implemented collaboration baseline against the Phase 2
scope and exit criteria in OMO-RMP-001. It does not expand the product scope or
design the Phase 3 server.

## Verdict

The required Phase 2 collaboration capabilities and architectural boundaries
are implemented. The authenticated Chromium smoke path now proves the existing
browser-to-Supabase collaboration flow from a reset and seeded local
environment. Phase 2 is formally closed.

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

**Met.** The repository verifies behavior at each owning layer:

- domain schema tests;
- application orchestration and typed-failure tests;
- Supabase adapter, mapping, Layer, and type tests;
- Angular Signal Store and component tests;
- PostgreSQL constraint, command, RLS, search, and realtime pgTAP tests;
- repository-wide format, synchronization, lint, typecheck, test, build, and
  clean-database gates.

The `client-e2e` Nx project additionally launches the real Angular application
against reset local Supabase data. Its Chromium smoke path signs in through the
rendered form, opens the authorized seeded workspace and channel, creates and
observes a message through the rendered composer and history, then signs out to
anonymous application entry. Playwright retains traces and screenshots when
the path fails.

## Implemented closeout slice

The deterministic browser smoke path has the following scope:

1. start from the documented local Supabase reset and seed;
2. launch the Angular client using its local environment;
3. sign in through the rendered authentication form as a seeded user;
4. resolve and open an authorized seeded workspace and channel;
5. create a uniquely identifiable message through the rendered composer and
   observe it in message history;
6. sign out and confirm anonymous application entry;
7. expose one documented local command and run it in CI after the local
   platform is ready.

The slice introduces no page-object or generic browser-testing layer.
Multi-browser coverage, visual-regression testing, performance testing, and
realtime multi-session scenarios remain later improvements.

## Phase 3 entry condition

The Phase 2 entry conditions for Phase 3 are satisfied. OMO-ARC-001 remains the
implemented collaboration architecture, and this audit records that its direct
browser-to-Supabase path must remain unchanged when `apps/server` is
introduced. OMO-ARC-003 and ADR-0001 through ADR-0002 now define the Phase 3
boundary. Work may proceed to the ordered server implementation slices without
redesigning the collaboration path.

## Reproducible verification

The audit uses the repository's existing public gates:

```bash
pnpm verify
pnpm db:verify
pnpm e2e:verify
```

At the implementation revision, all three local gates pass. The database gate
recreates the schema and seed from scratch, reports no schema-lint errors,
passes all 407 assertions across 25 pgTAP files, and regenerates the public
database types without a diff. The required GitHub Actions job runs the same
browser smoke after its clean platform setup; that remote run is the final
environment-specific confirmation before merge.
