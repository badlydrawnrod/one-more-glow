# Engineering principles

## Philosophy

Prefer boring, predictable software.

Code should be understandable by a competent developer unfamiliar with its implementation history.

Consistency, explicit contracts and maintainability take precedence over novelty.

## Design

- Prefer simple values and pure functions where appropriate.
- Make invalid states difficult to represent.
- Keep state ownership explicit.
- Make dependencies visible.
- Design around stable contracts, not implementation details.
- Prefer composition to inheritance.
- Avoid speculative generalisation.
- Minimise mutable shared state.
- Handle errors explicitly at appropriate boundaries.
- Optimise based on evidence, without disregarding obvious performance costs.

Use TypeScript's type system to express meaningful constraints. Avoid type assertions that bypass useful checking.

Prefer straightforward control flow over elaborate type-level programming.

## Public APIs

Public APIs should be small and deliberate.

Do not expose implementation-specific types through backend-independent contracts.

Do not expand public interfaces merely to accommodate one implementation.

Avoid breaking changes unless explicitly justified.

## Modules and dependencies

Each module should have a clear responsibility.

Dependencies should point towards stable abstractions.

Avoid circular dependencies.

Do not import implementation internals across component boundaries.

Introduce new components when they provide a meaningful architectural boundary, not simply to reduce file length.

## Testing

Test observable behaviour at stable boundaries.

Prefer tests that remain valid when implementations change.

Test meaningful invariants internally when necessary.

Use parameterised or shared contract tests where multiple implementations must satisfy the same behaviour.

Avoid tests that merely reproduce implementation details.

Prefer deterministic tests and explicit inputs.

## Complexity

A new abstraction must justify its maintenance cost.

Do not add frameworks, factories, registries, dependency injection systems or configuration layers without an actual requirement.

Prefer a little duplication to the wrong abstraction.

## Dependencies

Use the standard language and browser APIs where practical.

Adding a dependency requires a clear benefit that outweighs its maintenance and security costs.

## Documentation

Durable specifications capture intent and behaviour.

Architecture documentation records significant boundaries and their rationale.

Temporary implementation details belong in plans, not specifications.

Documentation must describe the intended system accurately; don't invent capabilities that have not been agreed or implemented.

## Specification lifecycle

Specifications are durable but evolve as understanding improves. A specification may contain accepted requirements, proposals, deferred capabilities and unresolved design decisions.

### Maturity

Use these terms where useful:

- **Proposed:** Candidate behaviour or design, not yet agreed.
- **Accepted:** Agreed intent or behaviour, authoritative for implementation.
- **Deferred:** Intentionally postponed, potentially with unresolved decisions.
- **Superseded:** Replaced by another documented decision.

Maturity applies to individual sections or capabilities where appropriate; a document need not have a single status.

### Implementation and verification

Maturity is independent of implementation status.

Distinguish what is intended from what has been implemented and verified. Use brief prose rather than elaborate status tracking unless greater precision is needed.

### Maintaining specifications

When making a change:

1. Identify the affected specification.
2. Check which requirements are accepted and which remain unsettled.
3. Resolve only the decisions necessary for the current task.
4. Record important decisions and their rationale in the specification.
5. Preserve deferred decisions and unresolved questions.
6. Update implementation and verification statements when appropriate.

Do not treat every described capability as an instruction to implement it.

Do not silently promote proposals into accepted requirements.

### Relationship to plans

Specifications preserve evolving intent, including unanswered questions.

Plans record temporary implementation progress.

Decisions with lasting relevance belong in specifications or architecture documentation, even when the corresponding implementation is deferred.

### Example: Deferred transformations

```markdown
## Transformations

**Status:** Proposed
**Implementation:** Not implemented

Games should be able to draw geometry using local
coordinate systems.

### Accepted requirements

- Drawing behaviour must be backend-independent.
- Current and future renderers must implement equivalent semantics through the renderer-independent drawing contract.

### Open decisions

- Should transforms belong to DrawingContext?
- Is a transformation stack necessary?
- What transformation composition order should be used?

### Next step

Resolve API ownership before implementing transformations.
```

The accepted requirements constrain future design without resolving the open questions prematurely.

The presence of this section does not authorise implementation of transformations.
