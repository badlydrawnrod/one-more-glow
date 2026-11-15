---
name: skeptic-review
description: Review code, designs, specifications, or changes for questionable assumptions, correctness gaps, unverified claims, and credible failure scenarios. Use when asked for a Skeptic review or an evidence-based challenge to proposed or existing work.
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

Use the project's specifications, architecture, and engineering guidance to understand intended behaviour, but do not assume that these documents are necessarily correct or complete.

## Review approach

Examine the work from an adversarial but evidence-based perspective.

Consider:

- **Assumptions:** What is being taken for granted? Which assumptions are undocumented, untested, or potentially false?
- **Correctness:** Does the work actually achieve its stated purpose? Can you construct counterexamples?
- **Edge cases:** What happens at boundaries, with unusual inputs, or under failure conditions?
- **Evidence:** Do tests and other evidence establish the claimed behaviour, or merely demonstrate selected examples?
- **Requirements:** Are the requirements internally consistent, sufficiently precise, and aligned with the stated goal?
- **Failure modes:** What could go wrong in realistic use, including unexpected interactions between components?

Distinguish demonstrated defects from plausible risks and unanswered questions.

Do not speculate about hypothetical problems without explaining a credible failure scenario.

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
