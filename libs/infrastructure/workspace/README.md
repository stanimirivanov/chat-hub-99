# Workspace Infrastructure

`@omoikane/infrastructure/workspace` implements workspace and active-membership
discovery with RLS-protected Supabase views, creation with the transactional
`create_workspace` RPC, detail replacement with `update_workspace`, member
workspace archiving with `archive_workspace`, restoration with
`restore_workspace`, member addition/reactivation with
`add_workspace_member`, role changes with
`change_workspace_member_role`, member suspension with
`suspend_workspace_member`, and member removal with `remove_workspace_member`.
Self-service departure uses the separate `leave_workspace` command.
Consent-based access uses `invite_workspace_member`,
`list_pending_workspace_invitations`, `accept_workspace_invitation`, and
`decline_workspace_invitation`. Owner management uses
`list_pending_workspace_invitations_for_workspace` and
`cancel_workspace_invitation`.
Per-user workspace-access invalidations use a private Supabase Broadcast topic
and refresh through the ordinary RLS-protected workspace query.
Selected-workspace online state uses a separate private Supabase Presence topic
authorized by active membership.

## Responsibilities

- Query active workspaces visible to the authenticated user.
- Query archived workspaces visible under the same active-membership RLS rule,
  newest archive first, and decode their lifecycle timestamps.
- Observe one authenticated user's private workspace-access topic and release
  it when the Effect Stream is interrupted.
- Track the authenticated profile on one selected workspace's private Presence
  topic, validate synced profile keys, and release tracking on interruption.
- Query active members through stable owner-first keyset pages backed by a
  partial active-directory index.
- Execute workspace creation without exposing owner identity as an argument.
- Execute workspace updates without exposing actor identity as an argument.
- Execute workspace archiving without exposing actor identity as an argument.
- Execute workspace restoration without exposing actor identity as an argument.
- Execute member addition or reactivation without exposing actor identity or
  role as arguments.
- Execute member role changes without exposing actor identity as an argument.
- Execute member removal without exposing actor identity as an argument.
- Execute reversible member suspension without exposing actor identity as an
  argument.
- Execute self-departure without exposing actor or target identity as an
  argument.
- Create pending invitations without granting immediate access, list only the
  authenticated recipient's pending invitations, and execute recipient-only
  acceptance or decline commands.
- List pending invitations with current usernames for an authenticated active
  owner and cancel them without deleting immutable history.
- Apply stable name/identity ordering.
- Map generated view and RPC rows into validated domain projections.
- Preserve actionable current-slug conflicts as a typed application failure.
- Preserve expected archive authorization and lifecycle rejections as a typed
  application failure.
- Preserve authorization, stale-membership, unchanged-role, and last-owner
  outcomes as typed application failures.
- Translate all other transport and row-validation failures.
- Supply `WorkspaceRepository` through an Effect Layer.

Generated database types and Supabase-shaped query contracts stop here. The
application and domain libraries do not depend on them.

## Runtime flow

```text
listAccessibleWorkspaces use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> current_workspaces view + RLS
  -> WorkspaceSchema decoding

listArchivedWorkspaces use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> archived current_workspaces rows + RLS
  -> ArchivedWorkspaceSchema decoding

observeAccessibleWorkspaces stream
  -> resolve and validate the current Supabase Auth user
  -> private workspace-access:<user-id> Broadcast topic
  -> membership-head invalidation
  -> current_workspaces view + RLS
  -> authoritative Workspace snapshot

observeWorkspacePresence stream
  -> WorkspacePresenceServiceTag
  -> SupabaseWorkspacePresenceServiceLayer
  -> authenticated profile identity + private workspace-presence topic
  -> validated distinct ProfileId snapshot

createWorkspace use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> create_workspace RPC
  -> WorkspaceSchema decoding of the canonical result

updateWorkspace use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> update_workspace RPC
  -> active-status/identity checks + WorkspaceSchema decoding

archiveWorkspace use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> archive_workspace RPC
  -> archived-status/identity validation + void acknowledgment

restoreWorkspace use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> restore_workspace RPC
  -> active-status/identity checks + WorkspaceSchema decoding

listWorkspaceMembers use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> current_workspace_memberships view + compound cursor + RLS
  -> WorkspaceMemberPage decoding

changeWorkspaceMemberRole use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> change_workspace_member_role RPC
  -> active target/identity checks + WorkspaceMemberSchema decoding

addWorkspaceMemberByUsername use case
  -> WorkspaceRepositoryTag.addMember
  -> SupabaseWorkspaceRepositoryLayer
  -> add_workspace_member RPC
  -> create or reinstate immutable membership history
  -> default-role/active-target/identity checks + WorkspaceMemberSchema decoding

removeWorkspaceMember use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> remove_workspace_member RPC
  -> removed target/identity validation

suspendWorkspaceMember use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> suspend_workspace_member RPC
  -> suspended target/identity validation

leaveWorkspace use case
  -> WorkspaceRepositoryTag
  -> SupabaseWorkspaceRepositoryLayer
  -> leave_workspace RPC
  -> left workspace-membership validation

inviteWorkspaceMemberByUsername use case
  -> WorkspaceRepositoryTag.inviteMember
  -> invite_workspace_member RPC
  -> pending identity/status checks + WorkspaceInvitationSchema decoding

listPendingWorkspaceInvitations use case
  -> WorkspaceRepositoryTag.listPendingInvitations
  -> recipient-scoped list_pending_workspace_invitations RPC
  -> WorkspaceInvitationSchema + WorkspaceSchema decoding

acceptWorkspaceInvitation / declineWorkspaceInvitation
  -> WorkspaceRepositoryTag recipient command
  -> transactional invitation event and membership activation / decline event
  -> canonical membership or invitation-state validation

listPendingWorkspaceInvitationsForOwner use case
  -> WorkspaceRepositoryTag.listPendingInvitationsForWorkspace
  -> owner-scoped list_pending_workspace_invitations_for_workspace RPC
  -> WorkspaceInvitationSchema + current-username decoding

cancelWorkspaceInvitation use case
  -> WorkspaceRepositoryTag.cancelInvitation
  -> owner-authorized cancel_workspace_invitation RPC
  -> cancelled identity/status validation
```

The membership query returns stable identities and roles only. It orders by
role descending and profile identity ascending, fetches one look-ahead row,
and derives the next application cursor without offset drift. Profile
enrichment remains a separate application capability, preventing the workspace
adapter from depending on profile persistence. Member-addition authorization,
default role assignment, active-profile validation, and immutable membership
reactivation remain transactional database concerns. A former or suspended
member keeps the same stable membership identity; the command appends
`reinstated` and advances its head as a default member, while an already-active
member remains an actionable typed failure. Role-change, removal, and
suspension authorization and last-owner invariants are likewise enforced there;
owner-driven removal and suspension cannot target the actor, while the separate
departure command can target only the provider-authenticated actor. The adapter
translates stable outcomes without reimplementing them. Owner-driven removal is
validated as `removed`, suspension as `suspended`, and voluntary departure as
`left`; each is acknowledged as `void` rather than being misrepresented as an
active `WorkspaceMember`. The focused client projection contains only
operations needed by implemented slices. Testing support provides fresh query
doubles and canonical generated rows.

Invitation identities and events are append-only. Their mutable heads enforce
one pending invitation per workspace/profile pair. Creation is owner-only and
rejects active members; recipient listing remains session-scoped; acceptance
and decline can only be performed by the addressed authenticated user. Active
owners can list pending invitations for their selected workspace and append a
terminal `cancelled` event after explicit client confirmation. Cancellation
removes pending projections without deleting history and is rejected after
workspace archival or another terminal response. Acceptance and membership
activation share one database transaction. A private database helper owns the
demonstrated create-or-reinstate transition used by both direct owner addition
and invitation acceptance, while each public RPC keeps its own authorization
policy. Email delivery, external addresses, expiry, and broad profile search
are outside this slice.

Workspace updates replace the complete mutable snapshot and append an immutable
database version. Owner authorization, active-workspace status, concurrent head
advancement, and current-slug uniqueness remain transactional RPC concerns. The
adapter validates the returned identity and active state, translates actionable
authorization and slug-conflict outcomes, and exposes only the canonical domain
workspace.

Workspace archiving appends an immutable archived version and advances the
workspace head transactionally. Restoration performs the inverse lifecycle
transition by appending a new active version; it never rewrites the archived
snapshot. Owner authorization, lifecycle state, stable memberships, and
concurrent head advancement remain database concerns. The archive adapter
returns `void` so an archived row cannot cross as an active `Workspace`; the
restoration adapter validates identity and active status before returning the
canonical projection. Hard deletion remains outside these slices.

Workspace access observation deliberately uses database Broadcast triggers
rather than publishing protected rows through Postgres Changes. Membership
changes invalidate the affected user; workspace archive and restoration
invalidate every still-active member because lifecycle status changes whether
the workspace belongs in active navigation. Each trigger sends only a workspace
identity to a private user topic. Realtime Authorization allows a client to
join only its own topic, and the adapter treats every event as an invalidation
rather than trusting its payload. Subscription readiness emits the first
invalidation, closing the query-before-subscribe gap. Stream interruption
removes the channel from the shared Supabase client.

Workspace presence uses Realtime Presence rather than a database table. Both
receiving and tracking are authorized by `realtime.messages` RLS policies that
require an active membership in the active workspace named by the topic. The
adapter derives its custom Presence key from Supabase Auth, validates synced
keys, and deduplicates multiple connections for display. Individual malformed
keys are ignored so one advisory event cannot break all observers. Presence is
not trusted for permissions, auditing, or durable activity history. Realtime
RLS proves that a publisher is an active member, but the client-reported
Presence key is not cryptographically bound to that publisher's JWT identity.

## Public API

- `SupabaseWorkspaceClientTag` and `SupabaseWorkspaceClient`
- `SupabaseWorkspaceRepositoryLayer`
- `SupabaseWorkspacePresenceServiceLayer`

## Verification

```bash
pnpm nx lint workspace-infrastructure
pnpm nx run workspace-infrastructure:typecheck
pnpm nx run workspace-infrastructure:typecheck:test
pnpm nx test workspace-infrastructure
```
