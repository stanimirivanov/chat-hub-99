# Code Quality and Documentation Benchmark

This document defines the review standard for future Omoikane vertical slices.
It is a decision framework, not a mechanical scorecard: a rule may be departed
from when the trade-off is explicit, local, and tested.

## 1. Responsibility placement

Place behavior in the innermost layer that can own it without depending on an
outer technology:

- Business validity, canonical identities, value objects, and domain states
  belong in `domain`.
- Workflow orchestration, use-case validation, outbound ports, and
  technology-independent failures belong in `application`.
- Supabase queries, RPC calls, generated database types, row/argument mapping,
  and technology error translation belong in `infrastructure`.
- Loading indicators, selected-view state, user interaction, and runtime
  execution belong in Angular features and composition code.

A module should have one primary reason to change. “One responsibility” does not
mean “one function per file”; cohesive operations that protect one invariant may
remain together.

Review questions:

- Is this rule meaningful without knowing the persistence or UI technology?
- Is this type a domain concept, an application contract, or an adapter
  representation?
- Could the behavior move inward without introducing an outward dependency?

## 2. Dependency direction and inversion

The permitted production dependency direction is:

```text
UI / composition
       ↓
infrastructure → application → domain
       ↓
shared generated database contracts (infrastructure only)
```

Application use cases depend on Effect service tags for outbound ports.
Infrastructure implements those ports and supplies them through Layers. Angular
composes and runs the final Effect but does not leak Angular services into
application or domain code.

Review questions:

- Does an inner layer import an outer technology?
- Does a use case know which database implements its port?
- Can the outbound dependency be replaced in a unit test without Angular or
  Supabase?
- Do generated database types stop at the infrastructure boundary?

## 3. Ports and interfaces

Prefer capability-oriented ports over technology-shaped wrappers. Do not expose
a generic Supabase client through the application layer. Add a repository
operation only when an implemented use case requires it.

A port is justified when it reverses a real dependency between policy and
implementation. Avoid speculative interfaces that merely wrap one concrete class
without establishing a boundary.

Port contracts should:

- use only domain and application types;
- return typed `Effect` values;
- expose technology-independent failures;
- avoid optional operations that implementations may silently ignore;
- document semantic guarantees, not implementation mechanics.

## 4. Runtime validation and schemas

Use an Effect `Schema` when runtime validation, decoding, encoding,
transformation, or metadata derivation is required.

Export a schema when it is part of a supported cross-module or cross-library
runtime contract. Keep it private when it is used only to implement one module.
Do not export a schema solely to make a test fixture convenient.

A private schema that is never decoded, encoded, or otherwise used at runtime is
unnecessary runtime machinery. Prefer a TypeScript interface or type alias in
that case.

Boundary rule:

```text
unknown external value
      ↓ decode with owner schema
validated domain/application value
      ↓ ordinary typed code
adapter representation
```

Tests for mappers should construct valid application commands from canonical
domain schemas and verify conformance with `satisfies`, rather than importing a
private aggregate schema only for fixture construction.

## 5. Effect contracts

Every exported use case and port operation must make all three Effect channels
intentional:

```ts
Effect.Effect<Success, Failure, Requirements>;
```

- **Success** describes the produced value.
- **Failure** is a typed, recoverable error vocabulary.
- **Requirements** lists services that must be provided before execution.

Exported use cases should normally declare an explicit return type. This
prevents accidental inference such as an `unknown` environment and makes the
architectural contract reviewable.

Application and domain code should build Effects but should not call
`Effect.runPromise`. Running belongs at a test or outer runtime boundary.

Document non-obvious Effect operators by explaining their role:

- `Effect.gen`: sequential orchestration with typed failure and dependency
  propagation;
- `yield* ServiceTag`: retrieves a required service from the Effect environment;
- `Effect.mapError`: translates one layer’s failure vocabulary into another;
- `Effect.flatMap`: sequences a dependent effectful operation;
- `Effect.provide`: satisfies an Effect requirement with a Layer or service;
- `Effect.either` / `Effect.flip`: test or boundary tools for observing typed
  failures without defects.

Comments should explain why an operator is used at that boundary, not restate
its name.

## 6. Typed errors

Use discriminated, data-carrying errors for expected failures.
`Data.TaggedError` is preferred when callers branch on `_tag` and tests compare
structural data.

A `Data.TaggedError` constructor receives one payload object:

```ts
new MessageRepositoryUnavailableError({
  operation,
  cause,
});
```

Do not use positional arguments for tagged errors.

Error ownership follows the boundary:

- domain errors describe violated domain invariants;
- application errors describe use-case and port failures;
- infrastructure-private errors describe mapping details and are translated
  before crossing into application;
- raw Supabase/PostgREST errors must not escape infrastructure.

Avoid placing user-generated content or secrets directly in exported errors
unless operationally necessary. Preserve lower-level diagnostic context in
`cause` when doing so does not expose sensitive data.

## 7. Imports and barrels

Imports should communicate locality and boundary ownership.

Recommended policy:

- same-folder dependencies use direct relative imports;
- cross-folder dependencies inside one library may use relative imports or an
  agreed private alias;
- external libraries use only the target library’s public entry point;
- a library must not import itself through its public entry point;
- deep imports into another library’s `src` tree are forbidden;
- use `import type` for symbols erased at runtime.

Folder-level `index.ts` files are allowed for cohesive capabilities when they
materially reduce import noise and define a useful local API. Inside that
folder, modules still import siblings directly to avoid hidden cycles.

Use explicit barrel exports. Avoid broad `export *` statements that silently
expand the public API.

## 8. Package boundaries

Create an Nx library when it establishes at least one of these:

- an independently enforceable dependency direction;
- a capability reused by multiple projects;
- an independently testable or publishable unit;
- a materially different ownership, runtime, or deployment boundary.

Use folders inside a library for responsibility grouping when modules share the
same dependency rules. More projects are not automatically a more SOLID design.

Nx tags and `@nx/enforce-module-boundaries` rules must encode the intended layer
direction. A README statement without executable enforcement is insufficient.

## 9. SOLID in this codebase

SOLID is applied pragmatically rather than mechanically:

- **Single responsibility:** database operations, mapping, composition, use
  cases, and presentation state are separate modules.
- **Open/closed:** application code depends on repository ports, allowing
  another adapter without modifying use cases.
- **Liskov substitution:** repository implementations must preserve the port’s
  success and failure semantics.
- **Interface segregation:** ports expose operations required by the message
  application; UI components do not depend on Supabase APIs.
- **Dependency inversion:** Effect service tags connect application policy to
  infrastructure implementations at the runtime composition root.

A separate Nx library is not created for every class or function. A package
boundary is justified only when it provides an independently enforceable
dependency rule or reusable capability.

## 10. Target runtime discipline

Production tsconfigs should expose only globals provided by their declared
runtime.

- Domain and application libraries should not include Node, DOM, Angular, or
  test globals unless required by their production runtime.
- Test tsconfigs may add Vitest and Node types.
- Infrastructure may depend on Supabase packages but should still avoid
  unrelated Node or browser globals.
- Runtime-specific APIs must remain in the layer that owns runtime composition.

Review both source imports and compiler ambient types; accidental globals can
create hidden runtime coupling even when imports look clean.

## 11. Project targets and verification

Every library should provide correctly scoped targets for production and test
typechecking. Target commands must reference that library’s own tsconfig.

Expected targets:

```text
lint
typecheck
typecheck:test
test
build (when buildable)
```

Workspace verification should fail on stale generated files, formatting drift,
lint errors, production type errors, test type errors, failing tests, or build
failures.

Whenever a project is copied or refactored, inspect `project.json` commands for
stale paths; a green command that checks another project is a false signal.

## 12. File-size and extraction review

File size is a diagnostic signal, not a rule. Review a large file for unrelated
reasons to change.

Extraction is usually justified when a file contains several of:

- database commands and read queries;
- mapping and orchestration;
- public composition and low-level transport logic;
- pure algorithms that can be tested independently;
- unrelated feature workflows with different invariants.

Do not extract a one-line abstraction merely to reduce line count. Extraction
should improve ownership, test isolation, reuse, or dependency visibility.

## 13. TSDoc standard

Add TSDoc to exported policy-bearing code and non-obvious internal algorithms.
Good documentation answers:

- What architectural role does this symbol play?
- Which invariant or boundary does it protect?
- What do the Effect success, failure, and requirement channels represent?
- What validation or normalization occurs?
- Which ordering, pagination, or state-transition guarantees apply?
- Why does this abstraction exist instead of direct technology access?

For Effect-returning APIs, prefer a compact contract description such as:

```ts
/**
 * Lists one newest-first page of messages for a channel.
 *
 * Validates the requested page size before accessing the repository. The
 * returned Effect can fail with a use-case validation error or any translated
 * repository error and requires `MessageRepository` to be provided.
 */
```

Document service tags and Layers in reader-friendly terms:

- a **Tag** is the typed key used to request a service from the Effect
  environment;
- a **Layer** is a construction recipe that supplies one service from its
  dependencies;
- `Effect.provide(layer)` resolves requirements without the use case knowing the
  implementation.

Avoid comments that merely restate names, syntax, or one obvious expression.
Generated code does not require hand-written documentation.

## 14. README standard

Every library README should contain:

1. purpose;
2. responsibilities and non-responsibilities;
3. dependency rule;
4. package/module structure;
5. public API;
6. important design decisions;
7. runtime data flow;
8. Effect concepts used by the library;
9. extension guidance;
10. verification commands.

Application and infrastructure READMEs should include one end-to-end flow
showing:

```text
caller → use case → service tag → repository implementation
       → Supabase query/RPC → runtime validation → domain value
```

Keep import-policy documentation synchronized with actual practice. Do not
prescribe a private alias that the codebase intentionally does not use.

## 15. Testing standard

Test at the narrowest owning layer:

- domain schemas: valid/invalid values and state variants;
- application use cases: validation, orchestration, required services, and typed
  failures;
- infrastructure operations: transport interaction, result validation, mapping,
  and error translation;
- Layers: dependency composition;
- type tests: compile-time boundaries and Effect signatures;
- Signal Stores: state transitions, concurrency/stale results, and collection
  updates;
- components: rendering and user interaction;
- database: constraints, authorization, and command behavior with pgTAP.

Test doubles should be isolated per test. Prefer factories that return both a
fresh mock and its Layer. Do not share a module-level `vi.fn()` whose call
history leaks between tests.

Test fixtures may use canonical exported domain schemas to construct branded
values. Use `satisfies` to verify aggregate application contracts without unsafe
casts.

Avoid `as unknown as` except at a deliberately documented external test boundary
where constructing the full third-party object would add no value. Prefer
focused typed stubs whenever practical.

Tests should not duplicate lower-layer validation in every outer layer, nor
should a production API be widened solely for tests.

## 16. Review checklist

Before merging a slice, verify:

- dependency direction remains inward;
- no generated/database type escaped into domain or application policy;
- target runtime globals and dependencies are minimal;
- new abstractions solve demonstrated coupling, ownership, or duplication;
- files and folders have cohesive reasons to change;
- exported schemas represent real runtime contracts;
- all type-only symbols use type-only imports/exports;
- tagged errors use object payload constructors and are translated at
  boundaries;
- exported Effects declare intentional success, failure, and requirement
  channels;
- public barrels are explicit and contain only supported contracts;
- exported policy-bearing symbols have intent-focused TSDoc;
- READMEs match the actual import policy and runtime data flow;
- project targets reference the correct project tsconfigs;
- tests cover success, validation, failure, mapping, and composition where
  applicable;
- lint, production typecheck, test typecheck, tests, build, and database
  verification pass.
