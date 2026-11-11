# Engineering principles

## Philosophy

Prefer predictable software that a developer can understand without knowing its history. Favor explicit contracts and maintainability over novelty.

## Design

- Prefer simple values, explicit state ownership and visible dependencies.
- Use stable contracts and straightforward control flow; avoid speculative generalisation and elaborate type-level programming.
- Use TypeScript to express meaningful constraints. Avoid assertions that bypass useful checking.
- Handle errors at clear boundaries and optimise based on evidence.

## Public APIs

Keep public APIs small and deliberate. Do not expose implementation-specific types through backend-independent contracts or expand shared interfaces for one implementation. Avoid breaking changes unless justified.

## Modules and dependencies

Give each module a clear responsibility. Depend on stable abstractions; avoid circular dependencies and imports of internals across component boundaries. Introduce components for meaningful boundaries, not just shorter files.

## Testing

Test deterministic, observable behavior at stable boundaries. Test internal invariants only when useful, and share contract tests when multiple implementations must preserve the same behavior. Avoid tests tied to incidental implementation details.

## Complexity

An abstraction or dependency must justify its maintenance cost. Do not add frameworks, factories, registries, dependency-injection systems or configuration layers without a concrete requirement. Prefer small duplication to the wrong abstraction; use standard language and browser APIs where practical.

## Documentation

Specifications capture behavior and evolving intent. Architecture documentation records significant boundaries and their rationale. Plans record temporary progress. Keep these purposes distinct and do not document unagreed capabilities as requirements.

## Specification lifecycle

Specifications are durable records of intent. They may contain accepted requirements, proposals, deferred capabilities and unresolved decisions; maturity applies to a capability or section, not necessarily to a whole document.

### Maturity

Use these terms where useful:

- **Proposed:** Candidate behaviour or design, not yet agreed.
- **Accepted:** Agreed intent or behaviour, authoritative for implementation.
- **Deferred:** Intentionally postponed, potentially with unresolved decisions.
- **Superseded:** Replaced by another documented decision.

Keep intended behavior distinct from implementation and verification status. For
accepted capabilities, including those in app specs, record whether they are
implemented, partially implemented or not yet implemented; note meaningful gaps.
Update that note when implementation changes. Use brief notes at the capability
or section level, and identify experimental implementations without implying
their design is accepted.

When changing behavior, check the relevant specification, resolve only decisions needed for the task, and record lasting decisions there. Preserve unrelated open questions. Do not promote proposals or deferred capabilities into requirements. Plans do not override specifications; move lasting decisions from plans into the appropriate durable document.
