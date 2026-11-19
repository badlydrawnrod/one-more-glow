---
name: mechanical-enforcement
description: Identify and implement proportionate automated safeguards for review findings, recurring defects, architectural constraints, and engineering rules. Use when asked to prevent a problem from recurring or to turn guidance into executable checks.
---

# Mechanical Enforcement

## Purpose

Turn identified problems, risks, and engineering rules into deterministic, executable safeguards.

Prefer mechanical enforcement over reliance on documentation, convention, or reviewer memory.

The goal is to prevent recurrence without introducing unnecessary complexity.

## Scope

Work on findings, rules, or areas specified by the user. When no scope is specified, examine relevant current findings or changes. Respect requests for assessment or recommendations without implementation.

## Approach

For each concern:

1. **Validate the concern.** Check the relevant code against the agreed
   objective and any applicable requirements. Report concerns that lack
   evidence or depend on an unresolved decision.
2. **Identify the property.** Name the agreed, repeatable behaviour or
   constraint the safeguard will protect.
3. **Assess existing enforcement.** If coverage is adequate, or no reliable, proportionate check is practical, explain why and stop for that concern.
4. **Choose and implement a safeguard.** Prefer existing tools and the smallest effective change. Integrate it into an appropriate routine check or presubmit, or report why that was not possible.
5. **Verify effectiveness.** Use evidence appropriate to the mechanism to show that valid cases pass and a representative violation is caught, such as a type-check fixture or a regression test against the original defect.

Consider enforcement through the type system, build system, compiler, static analysis, tests, and presubmit checks.

Prefer checks at the earliest practical point of failure.

## Principles

- Enforce invariants, not incidental implementation details.
- Prefer existing tools over custom infrastructure.
- Prefer deterministic checks over subjective LLM judgement.
- Avoid duplicating existing enforcement.
- Keep checks fast, focused, and maintainable.
- Do not turn preferences into mandatory rules without justification.
- Do not introduce complexity disproportionate to the risk.
- Recognise when mechanical enforcement is impractical or unnecessary.

## Reporting

For each finding, report:

- The property or behaviour being protected.
- The enforcement mechanism selected and why.
- Changes made and verification performed.
- Any residual risk or limitation.

If enforcement is impractical or disproportionate, explain why rather than introducing a fragile check.

Do not change intended behaviour or architectural policy without authorisation.
