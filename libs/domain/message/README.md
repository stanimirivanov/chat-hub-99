# Message Domain

`@chat-hub/domain/message` contains the technology-independent message model. It expresses what a valid message is, not how messages are stored, fetched, rendered, or synchronized.

## Responsibilities

- Branded identifiers such as `MessageId` and `ChannelId`
- Validated message content
- Active and deleted message projections
- Commands expressed in domain vocabulary
- Domain-level validation failures

## Dependency rule

This library may depend on general-purpose modeling tools such as Effect Schema. It must not depend on Angular, NgRx, Supabase, generated database types, browser APIs, or application services.

```text
application/message ──depends on──> domain/message
infrastructure/message ────────────> domain/message
client presentation ───────────────> domain/message (types only where useful)
```

## Modeling approach

Database rows are not domain entities. Infrastructure validates an untrusted database projection with the schemas in this library before application code receives it. Branded identifiers prevent accidental interchange of UUID-shaped values belonging to different concepts.

Deleted messages are modeled explicitly rather than represented as partially nullable active messages. This makes consumers handle the state transition deliberately.

## Internal modules

- `channel-id.ts` and `message-id.ts`: identity schemas and branded types
- `message-content.ts`: content normalization and length invariant
- `message.ts`: active/deleted message union and schemas

## Extension guideline

Add a domain abstraction only when it captures a business invariant or vocabulary shared by multiple use cases. Presentation-only state, Supabase payloads, and RPC result types do not belong here.

## Verification

```bash
pnpm nx lint message-domain
pnpm nx run message-domain:typecheck
pnpm nx run message-domain:typecheck:test
pnpm nx test message-domain
```
