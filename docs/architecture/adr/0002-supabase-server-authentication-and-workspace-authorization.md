# ADR 0002: Supabase server authentication and workspace authorization

> **Status:** Accepted  
> **Date:** 9 August 2026  
> **Decision owners:** Omoikane architecture

## Context

The Angular client already authenticates with Supabase and performs ordinary
collaboration operations directly under PostgreSQL Row Level Security. Phase 3
adds trusted server operations without creating a second account system or
turning the server into a proxy for those existing calls.

The server must distinguish four concerns:

1. receiving a browser access token;
2. proving the token identifies a current Supabase user;
3. determining whether that user may act in a workspace;
4. using privileged credentials only when a workflow cannot run with the
   user's RLS scope.

## Decision

The Angular client sends its current Supabase access token as
`Authorization: Bearer <access-token>` to protected server endpoints. It does
not send a refresh token. The server does not create its own login session or
refresh browser credentials.

A server-side Supabase Auth adapter validates the supplied token with
`auth.getUser(token)`. Its client disables session persistence, URL-session
detection, and automatic refresh. Successful validation is mapped to an
immutable, provider-independent request identity containing the canonical user
ID. Raw JWT claims and Supabase `User` objects do not cross the infrastructure
boundary.

Authentication is deny-by-default. A global Nest guard protects application
routes; only liveness, readiness, and explicitly selected OpenAPI routes are
public. Missing, malformed, expired, revoked, or otherwise invalid credentials
produce the same `401` problem type and a `WWW-Authenticate: Bearer` header.
Logs never contain access tokens.

Workspace-scoped routes carry the canonical workspace ID in the path. The
transport boundary decodes it before the use case runs. The application use
case requires both request identity and workspace ID and authorizes the
operation through a capability-oriented port. Inaccessible workspace resources
produce a single `404` problem type so the API does not reveal whether another
tenant's workspace exists.

Authorization uses the least privilege appropriate to the operation:

- Prefer a per-request Supabase data client carrying the user's access token so
  existing RLS policies enforce workspace scope.
- Use a privileged server adapter only when the workflow genuinely requires
  rights unavailable to the user-scoped client.
- A privileged write must include an explicit workspace-membership check in the
  same application workflow. When a check and mutation must be atomic, expose
  one database command/RPC that performs both in one transaction.
- The service-role credential is configuration owned by server infrastructure;
  it is never used to identify a caller and never reaches Angular, domain, or
  application code.

## Consequences

- Supabase remains the identity authority and RLS remains effective for
  user-scoped server access.
- Authentication can involve a network request to Supabase Auth. Readiness and
  telemetry must make that dependency visible; optimization to local JWT
  verification requires a later measured decision.
- Request identity is passed as explicit use-case input, avoiding ambient user
  state and request-scoped dependency graphs.
- Application errors remain provider-independent even though the first adapter
  uses Supabase.
- Revocation behavior follows Supabase Auth's token-validation semantics rather
  than a server-maintained session store.

## Rejected alternatives

- **Trust decoded JWT claims without validation:** unverified request data is
  insufficient for an authorization boundary.
- **Use a service-role client for every query:** this would bypass RLS by
  default and make every repository operation responsible for tenant safety.
- **Move existing collaboration operations behind the server:** this would add
  latency and duplicate an already tested RLS boundary without product value.
- **Store refresh tokens in the server:** the Angular SPA already owns session
  refresh; introducing a second session owner is outside Phase 3.

## Affected decisions and documents

This ADR refines, but does not supersede, OMO-ARC-000 decisions D-004, D-005,
and D-006. It preserves the direct collaboration boundary recorded by
OMO-ARC-001 and OMO-ARC-002 and is reflected in OMO-ARC-003.

## Implementation and verification implications

- Authentication adapter tests cover valid, missing, malformed, expired, and
  provider-unavailable outcomes without logging credential material.
- HTTP tests cover the uniform `401`, `WWW-Authenticate`, and inaccessible
  workspace `404` contracts.
- Authorization tests prove no repository operation runs before successful
  identity and workspace validation.
- Database tests cover any privileged transactional command and its membership
  rules.
- Existing Angular-to-Supabase browser tests remain unchanged. The first
  server-backed browser path is added only with the deterministic Analysis Run
  command.
