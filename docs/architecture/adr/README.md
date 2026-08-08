# Architecture Decision Records

Architecture Decision Records capture decisions made after the approved
Omoikane baseline. They exist to explain consequential choices, not to duplicate
implementation documentation.

No post-baseline ADR has been accepted yet.

## Authority

An accepted ADR supersedes OMO-ARC-000 only for the decision it explicitly
addresses. The affected baseline, roadmap, architecture, and operating
documents must be updated in the same pull request so readers do not have to
reconstruct the current position from an ADR chain.

## Lifecycle

Use one of these statuses:

- **Proposed:** under review and not authoritative.
- **Accepted:** the current decision.
- **Superseded:** replaced by another named ADR.
- **Rejected:** considered but not adopted.

ADR files use `NNNN-short-decision-title.md`. Numbers are never reused.

## Required content

Each ADR contains:

1. title, date, and status;
2. context and the concrete decision pressure;
3. decision;
4. consequences and trade-offs;
5. affected baseline decisions and documents;
6. implementation and verification implications.

Do not create an ADR for a local refactor that does not change an architectural
decision. Conversely, do not hide a change to a canonical baseline decision in
an ordinary implementation note.
