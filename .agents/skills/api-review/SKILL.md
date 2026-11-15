---
name: api-review
description: Review existing or proposed APIs for clarity, coherence, usability, misuse resistance, and compatibility. Use when asked to review public or internal interfaces, API designs, or API changes.
---

# API Review

## Purpose

Review APIs from the perspective of their intended consumers.

Identify unclear contracts, unnecessary coupling, surprising behaviour, and opportunities to make correct usage straightforward and misuse difficult.

The goal is a small, coherent, predictable API that communicates its intent clearly.

## Scope

Review the scope the user specifies. A repository-wide request means the whole
repository, even when current changes exist. Review changes, a PR, directories,
or files in their relevant context. If no scope is specified, review current
changes, including staged, unstaged, and relevant untracked work; if there are
none, ask what to review. Report material limits on review coverage.

If the selected scope contains no relevant APIs, say so.

Consider both public and internal interfaces, applying scrutiny proportionate to their consumers and stability requirements.

## Review approach

Evaluate:

- **Clarity:** Are names, operations, and contracts understandable without knowledge of the implementation?
- **Coherence:** Do related operations follow consistent conventions? Is the API's vocabulary minimal and predictable?
- **Correct usage:** Is the natural way to use the API also the correct way? Can invalid states or operations be prevented by design?
- **Ownership and lifetime:** Are resource ownership, borrowing, mutation, and lifetime expectations clear?
- **Errors and failures:** Are failure modes, error reporting, and recovery behaviour explicit and consistent?
- **Coupling:** Does the API expose unnecessary implementation details or impose avoidable dependencies?
- **Composition:** Can consumers combine operations naturally without special cases or hidden requirements?
- **Evolution:** Can the API accommodate plausible changes without unnecessary compatibility breakage?

Examine relevant specifications, prior interfaces, and representative consumer usage, including incorrect or unexpected usage, to assess compatibility.

Do not judge an API solely by its implementation.

## Findings

Report actionable findings ordered by significance.

For each finding, provide:

1. **Concern:** What makes the API unclear, inconsistent, fragile, or easy to misuse? Give its location or a precise reference.
2. **Evidence:** Demonstrate the problem using a concrete consumer scenario where possible.
3. **Impact:** Explain the consequence for callers or maintainers.
4. **Recommendation:** Suggest the smallest effective improvement, considering compatibility.

If no significant concerns are found, say so.

## Principles

- Prefer simple, explicit contracts over clever interfaces.
- Make correct usage easy and incorrect usage difficult.
- Prefer conventions familiar to the intended consumers.
- Do not introduce abstractions for hypothetical future requirements.
- Do not demand universal flexibility.
- Distinguish established contracts from proposed or deferred behaviour.
- Respect compatibility requirements and existing consumers.
- Review and report; do not modify the work unless explicitly requested.
