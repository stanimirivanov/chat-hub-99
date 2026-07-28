# Code Quality and Documentation Benchmark

This document defines the review standard for future Chat Hub vertical slices.

## 1. Responsibility placement

Place behavior in the innermost layer that can own it without depending on an outer technology:

- Business validity and domain states belong in `domain`.
- Workflow orchestration and outbound dependency contracts belong in `application`.
- Supabase queries, RPCs, generated types, and error translation belong in `infrastructure`.
- Loading indicators, selected-view state, and user interaction belong in Angular features.

A module should have one primary reason to change. “One responsibility” does not mean “one function per file”; cohesive operations that protect one invariant may remain together.

## 2. Dependency inversion

Application use cases depend on Effect service tags for outbound ports. Infrastructure provides implementations through Layers. Angular composes the runtime but does not leak Angular services into application code.

Review questions:

- Does an inner layer import an outer technology?
- Does a use case know which database implements its port?
- Can the dependency be replaced in a unit test without Angular or Supabase?

## 3. Interface design

Prefer capability-oriented ports over technology-shaped wrappers. Do not expose a generic Supabase client through the application layer. Add an operation to a port only when an implemented use case requires it.

Avoid speculative interfaces with one implementation when the interface does not define an architectural boundary. The repository port is justified because it reverses the dependency between application policy and persistence.

## 4. Package boundaries

Create an Nx library when it establishes at least one of these:

- an independently enforceable dependency direction;
- a capability reused by multiple projects;
- an independently testable or publishable unit;
- a materially different ownership or deployment boundary.

Use folders inside a library for responsibility grouping when modules share the same dependency rules. More projects are not automatically a more SOLID design.

## 5. File-size review

File size is a diagnostic signal, not a rule. Review a large file for unrelated reasons to change.

Extraction is usually justified when a file contains several of:

- database commands and read queries;
- mapping and orchestration;
- public composition and low-level transport logic;
- pure algorithms that can be tested independently;
- unrelated feature workflows with different state invariants.

The former `supabase-message-repository.ts` met this threshold and was split by operation. `ChannelMessagesStore` remains one store because its methods coordinate one selected-channel/request-generation invariant; pure collection and error transformations are already extracted.

## 6. TSDoc standard

Add TSDoc to exported policy-bearing code and non-obvious internal algorithms. Good documentation answers:

- What architectural role does this symbol play?
- Which invariant or boundary does it protect?
- What do callers receive on success and failure?
- Why does this abstraction exist?

Avoid comments that merely restate names or TypeScript syntax. Generated code does not require hand-written documentation.

## 7. README standard

Every library README should contain:

1. purpose;
2. responsibilities;
3. dependency rule;
4. package/module structure;
5. important design decisions;
6. extension guidance;
7. verification commands.

Feature/application READMEs should also describe the runtime data flow and state-ownership rules.

## 8. Testing standard

For each vertical slice, test at the narrowest owning layer:

- domain schemas: valid/invalid values and state variants;
- application use cases: validation, orchestration, and typed failures;
- infrastructure operations: transport interaction, mapping, and error translation;
- Signal Stores: state transitions, concurrency/stale results, and collection updates;
- components: rendering and user interaction;
- database: constraints, authorization, and command behavior with pgTAP.

Tests should not duplicate lower-layer implementation details in every outer layer.

## 9. Review checklist

Before merging a slice, verify:

- dependency direction remains inward;
- no generated/database type escaped into domain or application policy;
- new abstractions solve demonstrated coupling or duplication;
- files have cohesive reasons to change;
- exported policy-bearing symbols have intent-focused TSDoc;
- relevant README sections are updated;
- tests cover success, validation, failure, and concurrency where applicable;
- lint, tests, typecheck/build, and database verification pass.
