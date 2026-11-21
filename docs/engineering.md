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

## Work and documentation

| Artifact | What it answers | Where it belongs |
| --- | --- | --- |
| **Objective** | What should be better when this work is done, and for whom? | In the request, issue, or active plan. A sentence in prose can be enough. |
| **Plan** | How will we achieve the objective, check the result, and resume the work? | In a temporary [active plan](../plans/README.md) when sequencing or handoff warrants one. |
| **Specification** | What behavior should a user, caller, or maintainer be able to rely on? | In the owning app's or package's `docs/specs/`, or in root `docs/specs/` for shared behavior. Use `SPEC.md` as the entry point. |
| **Architecture** | What owns each responsibility, where are the boundaries, and why do they matter? | In [repository architecture](architecture.md) for shared structure and in the owning app or package for local boundaries. |

### Objectives and verification

Start with the agreed objective and identify what would show that it has been
achieved. Use observable success criteria where people could reasonably
interpret the objective in different ways. Account for any relevant behavior
that users or callers already rely on. An objective is enough to start work
when no spec covers it.

Choose checks that exercise the intended outcome. Use automated checks for
repeatable contracts and regressions. Use a manual walkthrough when judging
the presentation or trying real hardware is part of the evidence. Name the
setup and expected result for important scenarios. Keep reusable verification
scenarios in the spec or test suite.

### Verification evidence

To mark a checkpoint passed or claim a change verified, record the checked
state, commands and outcomes in the work item, active plan or change
description. For a review or manual check, name the files or scenarios
covered, relevant setup and what you observed. Identify failed, skipped,
unavailable or outstanding checks. A checkpoint stays open until current
evidence shows it passed. Limit final verification claims to the criteria
that evidence covers.

- **CI or clean checkout.** Cite the CI job and its checked-out commit (a PR
  run can check a merge commit), or record the local commit after confirming
  the checkout is clean, including untracked inputs.
- **Local changes.** Run `npm run --silent verification:tree` before the check
  or review and record the tree ID. It writes Git objects locally, preserving
  the index and working files. It covers Git's view of tracked working
  files and non-ignored untracked files. Identify any additional inputs the
  result depends on, such as an ignored fixture or a generated build tested
  in a browser. Keep inputs stable during the check.

Before relying on an earlier result, compare its state with the candidate.
Capture the current tree with the same command. For example,
`git diff --exit-code <checked-tree> <current-tree> -- <paths>`
returns zero for unchanged paths. Omit the path filter to compare everything.
Include the check, its inputs, shared dependencies, configuration and
applicable criteria in that comparison. If a
change could affect the result or its interpretation, repeat the affected
check or review before making the claim. For unrelated changes, retain the
original evidence and state briefly why it still applies. If the old tree is
unavailable and applicability cannot be established, repeat the check.

CI logs and change descriptions can hold evidence outside the checked tree.
An edit that only records a result leaves that result applicable unless the
record itself was under review. Changes to criteria or code in the same
document still need assessment.

### PR descriptions

Write the description for a developer reviewing the actual change against its
base. Lead with the problem or objective, then explain the resulting behavior.
Include implementation details only when they help assess the change, and scale
the description to the diff.

Keep intended behavior distinct from observed results. Record concise
verification evidence: what ran, its checked state or CI link, what passed, and
any material gaps. Mention limitations when they matter; omit an empty gaps
section. Before submitting, compare the PR title and description with the
base-to-head diff, remove claims inherited from earlier PRs, and check that an
automatically filled title clearly describes this change.

The PR helper requires non-empty Summary and Verification sections. Keep those
sections concise, and include a gaps note only when a gap is material:

```md
## Summary

Problem or objective, followed by the resulting behavior.

## Verification

Checks run and outcomes, with a CI link when available. Mention material gaps
only when there are any.
```

The PR helper checks that the description is non-empty and contains non-empty
Summary and Verification sections. These structural checks cannot establish
whether the description accurately explains the diff; authors and reviewers
must make that assessment.

### Specifications

Keep a spec for behavior worth preserving across changes. Describe the intent,
observable rules, and rationale a future maintainer needs. Specify particular
controls, values, or mechanisms when they are part of an agreed contract.

Consult any relevant spec when changing behavior. If the objective changes an
accepted requirement, make that decision explicit and update the spec as part
of the change. Capture newly agreed, lasting behavior in the relevant spec,
whether it was settled before implementation or learned through the work.
Preserve unrelated open questions.

Mark maturity at the capability or section level where it matters.

- **Proposed** is a candidate for discussion.
- **Accepted** is agreed behavior that guides implementation.
- **Deferred** is intentionally postponed.
- **Superseded** has been replaced by another decision. Link to its replacement.

Keep those decisions distinct from implementation and verification. Record
whether an accepted capability is implemented, partial, or still pending.
Identify experiments and meaningful verification gaps separately. Keep these
notes brief and update them when implementation or coverage changes.

### Architecture

Document component responsibilities, public entry points, dependency
direction, and important constraints on how components fit together. Explain
the reasoning where it helps future changes respect the boundary. Update the
architecture with a lasting change to those decisions or to the repository
structure. Routine implementation edits need an architecture update only if
they change something the document claims about the system.
