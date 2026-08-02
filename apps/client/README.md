# Chat Hub Angular Client

The client is the delivery mechanism for Chat Hub. It renders application state,
translates user interaction into application use-case calls, and composes the
Effect/Supabase runtime through Angular dependency injection.

## Layer responsibilities

- `core/`: application-wide runtime composition and thin Angular boundary
  services
- `features/`: vertical presentation slices with components and feature-local
  Signal Stores
- `app.config.ts`: Angular provider composition
- `app.routes.ts`: route-level feature composition
- `environments/`: build-time environment configuration

Cross-boundary client imports use `@client/*` and
`@client-environments/*`. Closely related modules within one feature or core
folder continue to use relative imports so locality remains visible.

The root route lazy-loads the authentication shell. This is the natural feature
boundary for keeping Effect, Supabase, and authenticated feature code out of
the small browser bootstrap bundle; query-parameter navigation does not destroy
that shell after it has loaded.

## Angular boundary

Effect use cases remain framework-independent. Services under `core` run
configured Effects and return Promises to Angular callers. They should not
reproduce business rules or database mapping.

```text
Component event
    ↓
Feature Signal Store
    ↓
Angular application service
    ↓
Effect use case + configured Layer
```

## Signal Store guideline

A feature store owns presentation state and coordination for one user-facing
capability. It may track loading status, stale-request protection, and local
collection updates. Business validation belongs in the domain or application
layer.

Do not create a global store merely because data may later be shared. Promote
state only after two implemented features require coordinated ownership.

## Feature structure

The initial `channel-messages` slice keeps closely related files together:

- component: template interaction and rendering
- store: asynchronous presentation workflow
- state: explicit state contract and status types
- collection helpers: pure deduplication operations
- error adapter: stable presentation-safe error shape

Message history retains the stable profile identity of each author. It uses
the root authentication store only to label the current user's messages and
show Edit/Delete controls for those messages. This is presentation behavior,
not authorization: Supabase command policies remain the security boundary.
An edit that normalizes to the current database value is reported as an
actionable unchanged-content failure. The existing projection and edit form
remain visible so the author can change or cancel the edit. The client does not
duplicate the comparison rule because only the database can evaluate it safely
against the authoritative value.
When an edit or deletion loses a race with archival or prior deletion, the
store retains the current history projection and exposes action-specific safe
feedback. The active edit form or deletion confirmation remains open so the
user can acknowledge or cancel it; raw database lifecycle details are not
rendered.
The workspace-owner capability already derived by the member directory is
forwarded through explicit navigation and message-component inputs. It lets an
owner request deletion of another author's active message but never exposes
editing for that message. This is a presentation affordance only: no membership
query or workspace state is added to the message store, and the existing
Supabase delete command remains the authorization boundary.
Message history also renders the existing lifecycle timestamps without adding
store state: every projection shows its creation time, edited projections show
their latest edit time, and deleted projections show their deletion time.
Angular formats visible values at the presentation boundary while semantic
`time` elements retain machine-readable ISO values and contextual labels.
Edited messages expose their immutable revision history on demand to the author
or through the existing workspace-owner presentation capability. Revision
pages live in the channel-message store because they share its selection and
stale-request boundary, but they keep independent loading, pagination, and
error state. Switching channels, opening another message, editing the target,
or receiving an authoritative update invalidates an outstanding revision
request. The UI capability is only an affordance: the `message_versions` RLS
policy remains the authorization boundary.
If message creation loses a race with workspace or channel archival, the store
retains the existing history and reports that the channel no longer accepts
messages. The composer clears its draft only after successful creation, so the
rejected text remains available without another client-side lifecycle rule.
For other authors, the channel-message store batch-loads RLS-visible current
profiles for each new page and renders their display names. The enrichment is
feature-local and best-effort: hidden or unavailable profiles retain the stable
“Another user” fallback, while stale profile responses cannot enrich a newly
selected channel.

After the initial page loads, the store starts one channel-scoped realtime
subscription. Created messages are prepended, loaded edited/deleted projections
are replaced in place, and changes for unloaded older messages are ignored.
Switching channels or destroying the feature interrupts the Effect Fiber and
removes the Supabase listener. Stream failures leave history readable and
expose an explicit retry action.

Author enrichment is a local store feature because both page loading and
realtime-created messages now require the same coordination. Selection,
pagination, realtime reconciliation, and mutations remain within one
feature-scoped consistency boundary.

The `workspace-navigation` slice owns a feature-scoped store. It loads active
workspaces visible through database RLS, creates workspaces through the
authenticated application command, and retains one explicit selection.
Creation has independent pending/error state and inserts only the canonical RPC
result into navigation. The component then writes the returned slug to the URL,
leaving the existing route effect as the selection authority.

The same navigation slice lets an owner replace the selected workspace's name,
slug, and description. It receives the owner affordance derived by the existing
member-directory feature rather than issuing a duplicate membership query;
Supabase remains the authorization boundary. Update state is independent from
creation, the canonical RPC result replaces the navigation projection, and a
selection generation rejects responses that complete after navigating away and
back. When the slug changes, the component replaces only the workspace query
parameter, preserving the selected channel while avoiding an invalid historical
URL.

Owners can archive the selected workspace after an explicit inline
confirmation. Archive command state is independent from creation and editing,
and only one workspace command can mutate navigation at a time. A successful
command removes its stable identity from the active collection even if the user
navigated elsewhere while it ran. Selection and the workspace/channel URL are
cleared only when they still refer to that archived target; obsolete failures
are not shown against a newer selection. The database remains responsible for
owner authorization and the immutable archived version. The client does not
offer restoration or hard deletion.

The nested `workspace-member-directory` slice loads active RLS-visible
memberships for the selected workspace and batch-enriches their stable profile
identities. Owners are displayed before members and the authenticated user is
labelled locally. Profile enrichment is best-effort: valid roles remain visible
with a neutral fallback name if profiles are unavailable. Displayed roles are
not an authorization decision; database policies and commands remain the
security boundary. An authenticated owner can request promotion, demotion, or
another member's removal from the same directory. Removal requires an explicit
inline confirmation and is not offered for the current owner because the
database command forbids self-removal. Role changes and removals share one
serialized member-mutation state independent from directory loading. Successful
commands reconcile only their validated canonical outcomes, and late results
after workspace navigation are ignored. The database independently authorizes
the actor and protects last-owner invariants.

Owners can also add an existing active profile by exact username. Addition has
its own form state because there is no target directory member yet. The
application workflow returns the canonical profile and membership together, so
the store updates both local projections without a follow-up query. Exact lookup
does not introduce broad user search, invitations, or reactivation of immutable
membership history. Late additions after workspace navigation are ignored, and
the database independently authorizes the owner and assigns the default member
role.

The nested `channel-navigation` slice reacts to that selected workspace, loads
only its active RLS-visible channels, and owns a separate feature-scoped
selection store. Its request generation prevents a late response for a
previous workspace from replacing the current collection. Selecting a channel
composes the existing `channel-messages` component through its typed input;
the two stores do not depend on each other. Active members can also create a
channel through the authenticated database command. Creation has independent
pending/error state, inserts the validated result in stable navigation order,
and then writes its normalized slug to the URL so the existing route effect
remains the selection authority.

The workspace owner capability already derived by the parent member directory
is passed into channel navigation as a presentation affordance; this avoids a
duplicate membership query while Supabase remains the authorization boundary.
Owners can edit a selected channel's name and description, while its workspace
and slug remain immutable. Update state is independent from loading and
creation, the normalized result replaces only mutable fields, and a selection
generation rejects late responses after navigating away and back. Because the
slug cannot change, a successful edit does not rewrite browser history.

Owners can also archive a selected channel after explicit inline confirmation.
The successful stable identity is removed from active navigation even if the
user moved elsewhere while the command ran; failures from obsolete selections
are hidden. A store-local tombstone prevents an older workspace reload from
reintroducing the archived channel. Selection, message rendering, and the
channel query parameter are cleared only when they still refer to the archived
target, including a workspace-identity check for same-slug channels. Restoration
and hard deletion remain outside this slice.

The `current-profile` slice enriches the authenticated header with the
RLS-visible profile belonging to the session identity. It keeps the
authentication session email as a reliable fallback while profile data loads
or fails. Its feature-scoped store does not duplicate session ownership, and a
late response for a previous session identity cannot replace the current
profile. The same feature supports self-service editing and replaces its state
only with the canonical profile returned by the application workflow. Avatar
values remain opaque editable text and are not rendered until a concrete media
or URL policy is implemented.

Workspace and channel selections are reflected in the root route as validated
slugs:

```text
/?workspace=chat-hub-development&channel=general
```

The URL is the browser-history and deep-link source of selection, while the
stores retain canonical branded identifiers after matching a slug against the
RLS-visible collection. Changing workspaces removes the channel parameter.
Unknown slugs are removed with history replacement only after their owning
collection loaded successfully; repository failures therefore remain retryable
and are not misclassified as invalid navigation.

## Testing

Component tests verify rendering and interaction. Store tests verify state
transitions and stale-result behavior. Application and infrastructure behavior
is tested in their owning libraries.

Angular application services are the Effect execution boundary. They run lazy
application Effects through the shared managed runtime and expose expected
failures as typed `Either` values. Signal Stores match those values into
presentation state; they do not compose Layers, run Effects, or catch expected
application failures as `unknown`.

```bash
pnpm nx lint client
pnpm nx run client:typecheck
pnpm nx run client:typecheck:test
pnpm nx test client
```
