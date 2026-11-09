# Implementation plans

Plans are temporary, resumable records of implementation work.

They describe **how work is progressing**, not the durable requirements of the software.

Authoritative requirements belong in `docs/specs/`. Architectural rules belong in `docs/architecture.md` and `docs/engineering.md`.

## When to create a plan

Create a plan for work that:

- Spans multiple meaningful steps or development sessions.
- Involves significant design decisions or architectural changes.
- Is likely to require handover between developers or agents.

Do not require plans for trivial fixes or small, self-contained changes.

## Creating a plan

1. Copy `plans/template.md` to `plans/active/<descriptive-name>.md`.
2. Link relevant durable specifications.
3. Record the objective, scope and initial steps.
4. Identify the first concrete action.

Plans should be concise and proportional to the task.

## Maintaining a plan

Update the plan during implementation, not just at the beginning and end.

In particular:

- Keep the work checklist accurate.
- Record important decisions and their rationale.
- Record verification results, including failures.
- Keep **Next action** current.
- Record unresolved questions or blockers.

A fresh agent or developer should be able to read the plan, inspect the repository and resume work without access to the previous conversation.

Before resuming, verify the plan against the actual state of the repository. The plan may be stale.

## Completing a plan

When work is finished:

1. Verify the completion criteria.
2. Transfer durable decisions and requirements into the appropriate documents under `docs/`.
3. Run relevant checks, including tests when observable behavior changes.
4. Delete the completed plan.

Completed plans are not authoritative documentation. Keep them only when there is a specific historical reason.

## Guiding principle

**Specifications preserve intent. Tests verify behaviour. Plans preserve progress.**
