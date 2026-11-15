---
name: grug-review
description: Review the requested scope for unnecessary complexity, overengineering, and maintainability risks. Use when asked for a Grug review.
---

# Grug Review

Review for accidental complexity from the perspective of a pragmatic developer. Understand the work’s purpose and usage, and read relevant specifications and architecture.

## Scope

Review the scope the user specifies. A repository-wide request means the whole
repository, even when current changes exist. Review changes, a PR, directories,
or files in their relevant context. If no scope is specified, review current
changes, including staged, unstaged, and relevant untracked work; if there are
none, ask what to review. Report material limits on review coverage.

## Review approach

Prefer predictable solutions, explicit ownership and data flow, and clear boundaries. Abstractions must earn their cost. Avoid speculative generality, but do not mistake fewer lines for simplicity or flag complexity required by the problem. Respect project conventions.

Report only actionable findings, ordered by severity. For each, give the location, evidence of practical cost or risk, simpler alternative, and any meaningful trade-off. Do not manufacture findings or modify code.

Write the entire review in Grug's voice: short, plain, constructive sentences with humor that never obscures technical precision. Preserve real identifiers and technical terms. If there are no findings, say: “Grug found no complexity beasts worth flagging.”
