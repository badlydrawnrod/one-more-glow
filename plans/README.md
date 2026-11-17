# Implementation plans

Plans are temporary, resumable records of implementation work.

They describe **how work is progressing**, not the durable requirements of the software.

Package requirements belong in `packages/<package>/docs/specs/`; app-specific specifications belong in `apps/<app>/docs/specs/`. Cross-package requirements belong in root `docs/specs/`. Architectural rules belong in `docs/architecture.md` and `docs/engineering.md`.

Keep plans for work confined to one app in `apps/<app>/plans/active/`. Keep library and cross-app plans in `plans/active/`. Create the relevant directory when needed.

## When to create a plan

Create a plan for work that:

- Spans multiple meaningful steps or development sessions.
- Involves significant design decisions or architectural changes.
- Is likely to require handover between developers or agents.

Do not require plans for trivial fixes or small, self-contained changes.

## Creating a plan

1. Copy `plans/template.md` to the appropriate active directory as `<descriptive-name>.md`.
2. Link relevant durable specifications.
3. Record the objective, scope and initial steps.
4. Identify the first concrete action.

Plans should be concise and proportional to the task.

## Writing steps for a handoff

- For behavior changes, tie the scope to the accepted part of the relevant
  spec. Identify the existing entry point, files or functions to start from,
  and any public behavior the change must preserve.
- Order the work by dependency. Give each meaningful step one observable
  outcome that can be checked before starting work that depends on it. Name
  a prerequisite explicitly when the order alone does not make it clear.
- Give each step a checkpoint with the command or manual action, the relevant
  setup or input, and the expected result. Use the smallest applicable
  workspace command from the [root README](../README.md). For manual checks,
  name the entry point and any browser, device, or fixture needed to reproduce
  the result. One checkpoint can cover several small edits.
- If a decision or an unknown capability blocks a step, state what evidence
  or decision would unblock it. Make the investigation its own step and name
  the work that can proceed independently.

For example, a diagnostics sizing checkpoint can specify the Robots preset at
DPR 3 with a 1200 × 900 CSS pixel stage. Expect a 1024 × 768 CSS pixel canvas
and a 2048 × 1536 pixel backing buffer. Include the browser or emulation setup
used to reproduce those conditions.

## Maintaining a plan

Update the plan during implementation, not just at the beginning and end.

In particular:

- Check off a step after its checkpoint passes.
- Record important decisions and their rationale.
- Record verification results, including failures. Mark checks that require an
  unavailable browser, device, or fixture as pending and say what is needed.
- Keep **Next action** current. Name the first feasible action and where to
  start.
- Record unresolved questions or blockers.

A fresh agent or developer should be able to read the plan, inspect the repository and resume work without access to the previous conversation.

Before resuming, verify the plan against the actual state of the repository. The plan may be stale.

## Completing a plan

When work is finished:

1. Verify the completion criteria.
2. Transfer durable decisions and requirements into the appropriate shared or app-local documents.
3. Run relevant checks, including tests when observable behavior changes.
4. Delete the completed plan.

Completed plans are not authoritative documentation. Keep them only when there is a specific historical reason.

## Guiding principle

**Specifications preserve intent. Tests verify behaviour. Plans preserve progress.**
