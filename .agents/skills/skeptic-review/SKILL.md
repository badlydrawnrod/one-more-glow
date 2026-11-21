---
name: skeptic-review
description: Review code, designs, specifications, or changes for questionable assumptions, correctness gaps, unverified claims, and credible failure scenarios. Use for a Skeptic review, including ambiguity review of a work item before substantial planning.
---
# Skeptic Review

## Purpose

Review code, designs, specifications, or specified changes with constructive scepticism.

Challenge assumptions, identify unverified claims, and look for counterexamples that could invalidate the intended behaviour.

The goal is to establish justified confidence in correctness, not to manufacture doubt.

## Scope

Review the scope the user specifies. A repository-wide request means the whole
repository, even when current changes exist. Review changes, a PR, directories,
or files in their relevant context. If no scope is specified, review current
changes, including staged, unstaged, and relevant untracked work; if there are
none, ask what to review. Report material limits on review coverage.

Start from the agreed objective, even when it exists only in the request. Use
the applicable specifications and architecture to identify commitments the work
must respect. Challenge gaps or contradictions in those sources when they
affect the outcome.

## Review approach

Examine the work from an adversarial but evidence-based perspective.

Consider:

- **Assumptions:** What is being taken for granted? Which assumptions are undocumented, untested, or potentially false?
- **Correctness:** Does the work actually achieve its stated purpose? Can you construct counterexamples?
- **Edge cases:** What happens at boundaries, with unusual inputs, or under failure conditions?
- **Evidence:** Would the proposed checks establish the objective? For completed work, what do the actual results show, and which important cases remain unverified?
- **Requirements:** Are the requirements internally consistent, sufficiently precise, and aligned with the stated goal?
- **Failure modes:** What could go wrong in realistic use, including unexpected interactions between components?

Distinguish demonstrated defects from plausible risks and unanswered questions.

Do not speculate about hypothetical problems without explaining a credible failure scenario.

## Before substantial planning

Start from the work item, whether it is a request, issue or spec. Test its
terms, scope and success criteria against a concrete case. What should the
user observe if it fails? Look for conflicting commitments, missing
constraints and proposals being treated as settled.

Inspect the repository or run a small experiment to answer factual questions.
Make routine implementation choices and explain consequential assumptions.
Ask the requester only about decisions that affect intent, behavior, scope,
compatibility or an important tradeoff. Group a few related questions, show
how the answers would change the outcome, and recommend a choice when useful.
Apply each answer to the work item and revisit any uncertainty it exposes.
Use the [planning readiness rule](../../../plans/README.md#when-to-create-a-plan)
to decide when to proceed. Focused questions suffice for this review.

## Findings

Report actionable findings, ordered by significance.

For each finding, provide:

1. **Concern:** What assumption, claim, or behaviour is questionable? Give its location or a precise reference.
2. **Evidence:** What supports the concern? Include a counterexample where possible.
3. **Impact:** What could go wrong, and under what conditions?
4. **Resolution:** What would establish confidence or address the issue?

Do not duplicate concerns that are already adequately addressed.

If no significant concerns are found, say so.

## Principles

- Be sceptical, not cynical.
- Prefer concrete counterexamples over speculation.
- Distinguish uncertainty from demonstrated error.
- Do not demand exhaustive proof where proportionate evidence is sufficient.
- Do not propose complexity merely to address improbable scenarios.
- Acknowledge when existing evidence is convincing.
- Review and report; do not modify the work unless explicitly requested.
