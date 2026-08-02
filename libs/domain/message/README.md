# Message Domain

`@chat-hub/domain/message` contains the technology-independent message model. It expresses what a valid message is, not how messages are stored, fetched, rendered, or synchronized.

## Responsibilities

- Branded message identifiers such as `MessageId`
- Stable author identity represented by the profile-domain `ProfileId`
- Validated message content
- Active and deleted message projections
- Immutable message revision identity, ordering, and content contracts
- Commands expressed in domain vocabulary
- Domain-level validation failures

## Dependency rule

This library may depend on the channel domain for channel identity, the profile
domain for stable author identity, and general-purpose modeling tools such as
Effect Schema. It must not depend on Angular, NgRx, Supabase, generated
database types, browser APIs, or application services.

```text
application/message ──depends on──> domain/message
infrastructure/message ────────────> domain/message
client presentation ───────────────> domain/message (types only where useful)
```

## Modeling approach

Database rows are not domain entities. Infrastructure validates an untrusted database projection with the schemas in this library before application code receives it. Branded identifiers prevent accidental interchange of UUID-shaped values belonging to different concepts.

Deleted messages are modeled explicitly rather than represented as partially nullable active messages. This makes consumers handle the state transition deliberately.

Both active and deleted projections retain `authorId`. Authorship belongs to
the stable message identity and does not change when message content is edited
or soft-deleted.

## Internal modules

- `message-id.ts`: message identity schema and branded type
- `message-content.ts`: content normalization and length invariant
- `message.ts`: active/deleted message union and schemas
- `message-revision-id.ts`: immutable revision identity schema and branded type
- `message-revision.ts`: positive version number and immutable revision schema

## Extension guideline

Add a domain abstraction only when it captures a business invariant or vocabulary shared by multiple use cases. Presentation-only state, Supabase payloads, and RPC result types do not belong here.

## Verification

```bash
pnpm nx lint message-domain
pnpm nx run message-domain:typecheck
pnpm nx run message-domain:typecheck:test
pnpm nx test message-domain
```
