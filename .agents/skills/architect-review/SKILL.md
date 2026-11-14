---
name: architect-review
description: >
  Review changes for compliance with the repository's
  intended architecture, component boundaries, and
  public contracts. Use for architectural reviews.
---

# Architect Review

Review changes against the repository's documented
architectural intent.

Your role is to detect architectural drift, not to
redesign the system.

## Sources of authority

Read only what is relevant:

1. Repository agent instructions.
2. Architecture documentation.
3. Relevant behavioural specifications.
4. Existing public interfaces and build boundaries.

Distinguish accepted decisions from proposals and
deferred decisions.

Do not treat existing implementation details as
architectural requirements without supporting evidence.

## Review

Examine the changes for:

- **Boundaries:** Components depend only on permitted
  components and interfaces.
- **Responsibilities:** Behaviour belongs to the
  appropriate component or layer.
- **Contracts:** Public APIs preserve documented
  semantics and invariants.
- **Dependencies:** Changes do not introduce unwanted
  coupling or dependency direction.
- **Encapsulation:** Implementation details do not
  leak across architectural boundaries.
- **Consistency:** New code follows established
  architectural patterns where applicable.
- **Enforcement:** Identify established architectural
  constraints that are not adequately enforced by
  existing mechanical checks.

## Review discipline

- Evaluate the architecture actually documented.
- Do not impose preferred patterns or abstractions.
- Do not invent requirements for undecided features.
- Distinguish architectural violations from suggestions.
- Prefer the smallest change that restores compliance.
- Do not duplicate ordinary code-quality reviews.
- Do not modify files.

## Enforcement gaps

Identify opportunities to enforce established
architectural constraints mechanically.

For each gap:

- Identify the documented architectural constraint.
- Explain how the current tooling permits violations.
- Suggest the simplest reliable enforcement mechanism.
- Prefer existing build, type, lint, test, or presubmit
  mechanisms over new infrastructure.

Do not:

- Invent constraints or promote proposals to requirements.
- Recommend enforcement for subjective design preferences.
- Recommend checks that would reject legitimate behaviour.
- Modify files or implement enforcement mechanisms.

Report only meaningful gaps, not every theoretical
possibility.

## Findings

Report actionable findings only.

### Architectural violations

For each finding:
- Location: relevant files and lines.
- Constraint: the documented architectural requirement.
- Violation: how the change conflicts with it.
- Consequence: why the deviation matters.
- Remedy: the smallest reasonable correction.

### Enforcement gaps

For each finding:
- Constraint: the established architectural requirement.
- Gap: why existing mechanisms do not enforce it.
- Recommendation: the simplest reliable check.

### Unresolved decisions

Identify ambiguities that prevent architectural
assessment. Do not resolve them yourself.

If no meaningful findings exist, say so.

Do not modify files.
