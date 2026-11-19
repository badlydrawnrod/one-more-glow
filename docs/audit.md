# Audit and maintain agent guidance

Review the repository's agent-consumable Markdown documentation. Improve its clarity, consistency and economy, and establish a lightweight approach to keeping it effective over time.

**Use:** This is an on-demand audit brief. Apply it only when the user explicitly requests an audit of agent-consumable documentation or names this file. It does not add standing instructions for ordinary repository work.

**Scope:** Include maintained, repository-owned Markdown that agents may use for instructions, engineering guidance, architecture, behavior or planning. Exclude generated and vendored files.

## Context

The repository already has engineering principles, architectural guidance, behavioural specifications and agent instructions. These have generally produced good results.

However, the documentation is gradually growing. I want to avoid accumulating redundant, contradictory or overly prescriptive instructions.

The primary audience is coding LLMs. The purpose of these documents is to help agents consistently make decisions aligned with the repository's engineering principles, architecture and intended behaviour.

**Optimise for effective agent behaviour, not documentation completeness.**

## 1. Audit the existing guidance

Inspect all agent-consumable Markdown files, including `AGENTS.md`, relevant package-level instructions, engineering guidance, architecture documentation, specifications and planning conventions.

Evaluate the documents collectively, not just individually.

Look for:

- **Redundancy:** Instructions repeated across documents, including repetition expressed in different words.
- **Ambiguity:** Instructions that permit materially different interpretations.
- **Contradiction:** Requirements that disagree or establish unclear precedence.
- **Scope:** Guidance that applies too broadly, or appears in a document where it does not belong.
- **Authority:** Unclear distinctions between binding requirements, recommendations, examples, proposals and deferred decisions.
- **Over-specification:** Rules that constrain implementation choices without a demonstrated benefit.
- **Discoverability:** Important instructions that agents may not encounter when relevant.
- **Obsolescence:** Guidance that no longer reflects the repository's architecture, tools or conventions.
- **Context cost:** Material whose value does not justify the attention and context it consumes.

Preserve useful engineering intent, even when simplifying its expression.

## 2. Simplify and consolidate

Make targeted improvements to the existing documents.

Follow these principles:

1. Prefer removing or consolidating text over adding new text.
2. Give each instruction one authoritative home. Reference it elsewhere only when necessary.
3. Keep `AGENTS.md` short: its main responsibilities are orientation, essential constraints and directing agents to relevant information.
4. Keep durable engineering principles, architectural decisions, behavioural specifications and temporary execution plans distinct.
5. Express requirements directly, using precise language and consistent terminology.
6. Distinguish accepted requirements from proposed, unresolved and deferred decisions. Never turn an open question into an implementation requirement.
7. Avoid rules that merely restate ordinary good engineering practice unless they address a specific repository concern.
8. Prefer deterministic enforcement through existing tools over prose instructions where practical.
9. Avoid introducing new abstractions, frameworks or documentation layers without a clear need.
10. Preserve valuable rationale where it helps agents make decisions in situations not explicitly covered by the rules.

Use the principles of plain technical English (ISO 24495-1): make instructions easy to find, understand and use. Prefer concise, concrete statements over broad exhortations.

Do not sacrifice meaning or important constraints simply to reduce word count.

## 3. Assess instruction effectiveness

Consider whether the resulting guidance would support correct decisions in representative repository tasks.

Pay particular attention to situations involving:

- Respecting public APIs and architectural boundaries.
- Following established engineering conventions without inventing new ones.
- Starting from a prose objective and observable success criteria when no spec
  covers the work.
- Distinguishing current requirements from deferred features.
- Making the smallest change that satisfies a requirement.
- Updating durable specifications when agreed behaviour changes.
- Using execution plans without turning them into permanent specifications.
- Choosing checks that exercise the intended outcome and separating expected
  from observed results.

Identify a small number of realistic scenarios that could reveal weaknesses in the guidance.

Do not assume that an instruction works merely because it reads clearly.

If practical, evaluate representative scenarios against the actual guidance. Distinguish observed agent behaviour from predicted behaviour; do not claim that an unexecuted evaluation has passed.

## 4. Prevent future instruction drift

Recommend and implement only lightweight, proportionate safeguards.

The objective is to prevent guidance from accumulating indefinitely while preserving its effectiveness.

Consider:

- A brief instruction for agents to consolidate existing guidance before adding new rules.
- Checks for broken references, inconsistent conventions or other objectively detectable problems.
- A small set of behavioural evaluation scenarios, if they provide meaningful value.
- Reusing existing verification workflows rather than introducing new infrastructure.

Avoid circular solutions: do not create extensive new guidance describing how to keep guidance concise.

In particular, do not introduce an elaborate evaluation framework, new dependencies or ongoing maintenance obligations unless their benefits clearly justify them.

A recurring agent failure does not automatically justify another instruction. First determine whether the cause is missing guidance, poor discoverability, unclear intent, inadequate enforcement or ordinary model error.

## 5. Deliverables

1. **Audit findings:** A concise, prioritised summary of material problems, with file references and concrete examples.
2. **Improvements:** Targeted edits to the existing documentation, preserving engineering intent.
3. **Safeguards:** The smallest useful mechanism for keeping the guidance effective and preventing unnecessary growth.
4. **Verification:** What was checked, what was actually tested, and any remaining uncertainty.
5. **Summary:** Files changed, important consolidations, and any decisions that require human judgement.

Do not create a separate report file unless there is a compelling reason. Present the audit findings and summary in your final response.

## Constraints

- Treat the repository's existing documented decisions as authoritative unless they conflict or are demonstrably obsolete.
- Do not change software behaviour, public APIs or architectural decisions as part of this audit.
- Do not silently resolve conflicting requirements; flag substantive conflicts for review.
- Do not introduce speculative requirements.
- Do not add guidance merely to compensate for hypothetical agent failures.
- Keep changes focused, understandable and proportionate.

**Success means that future agents can reach the same intended engineering decisions with less documentation to read and fewer opportunities for misunderstanding.**

The aim is not a perfect documentation system. It is a small, durable and effective body of guidance that resists unnecessary growth.
