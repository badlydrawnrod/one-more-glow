# Agent instructions

One More Glow is a small TypeScript library for retro-inspired vector graphics. It supports interchangeable Canvas 2D and WebGL2 renderers.

The project values simple, predictable, maintainable engineering over cleverness or fashionable abstractions.

## Read before working

- `docs/engineering.md` — engineering principles and conventions.
- `docs/architecture.md` — module boundaries and dependencies.
- Relevant files in `docs/specs/` — durable behavioural requirements.
- Relevant active plans in `plans/active/` — current implementation progress.

Read only the documentation relevant to the task.

## Working rules

1. Preserve architectural boundaries.
2. Prefer small, explicit, understandable changes.
3. Do not introduce abstractions, dependencies or infrastructure speculatively.
4. Maintain the renderer-independent drawing contract.
5. Test observable behaviour through stable public interfaces.
6. Prefer deterministic, mechanically enforced rules over conventions alone.
7. Keep durable specifications consistent with intended behaviour.
8. Do not treat implementation plans as specifications.
9. Distinguish accepted requirements from proposals, deferred decisions and implemented behaviour. Do not treat an unimplemented or unsettled specification as an instruction to implement it.

## Specifications

Specifications under `docs/specs/` are durable records of evolving intent, not necessarily completed designs.

Follow the specification lifecycle described in `docs/engineering.md`.

When reading or updating specifications:

- Distinguish accepted requirements from proposals and deferred decisions.
- Distinguish intended behaviour from implemented and verified behaviour.
- Make unresolved questions explicit rather than silently deciding them.
- Do not implement proposed or deferred capabilities unless they are in scope for the current task.
- Update affected specifications when decisions are made or behaviour changes.

Keep specifications lightweight. Use status annotations only where they clarify genuine uncertainty or progress.

## Plans

For substantial, multi-step work, follow `plans/README.md` and use `plans/template.md` to create a plan under `plans/active/`.

Plans are ephemeral execution records, not authoritative specifications. Do not create plans for trivial changes.

Keep plans resumable without conversation history. Update progress, decisions, verification results and the next action as work proceeds.

Before resuming, reconcile the plan with the actual repository state.

On completion, preserve lasting intent and decisions in durable specifications or architecture documentation, then delete the plan.

## Changes

Before implementation, identify affected specifications, their maturity, and relevant architectural boundaries.

Resolve decisions required by the current task. Preserve unrelated open questions rather than expanding scope.

After implementation:

- Run relevant checks and report their results.
- Update affected specifications to reflect agreed behaviour, decisions and implementation status.
- Preserve durable decisions made during implementation.
- Keep unfinished work and resumable progress in the active plan, if one exists.
