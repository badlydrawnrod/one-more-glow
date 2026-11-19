# Implementation plans

An active plan is a temporary record of how to achieve and verify an objective.
It gives the next person enough context to resume the work. See
[work and documentation](../docs/engineering.md#work-and-documentation) for
the roles of objectives, specifications, and architecture.

## When to create a plan

Create a plan when the work has meaningful steps to sequence, a design decision
to investigate, or a likely handoff across people, agents, or sessions. A small,
self-contained change can start from the objective and a suitable check.

Start with the [template](template.md). Keep app-specific plans in
`apps/<app>/plans/active/` and library or shared work in `plans/active/`.

## Write a resumable plan

- State the objective and the observable criteria for achieving it. Link
  relevant specs and architecture where they apply. For behavior without a
  spec, use the agreed objective and criteria as the basis for the plan.
- Order meaningful steps by dependency. Name the entry point or starting files
  when they help a handoff. Give each meaningful step a checkpoint with an
  action or command, any relevant setup, and the expected result. Use the
  smallest applicable workspace command from the [root README](../README.md).
- When discovery or a decision blocks a step, say what evidence or decision is
  needed and which work can proceed independently.
- Record the first feasible next action so the plan can be picked up without
  access to the original conversation.

### Example from diagnostics

**Objective** — When part of the test pattern disappears, a user can tell
whether scrolling will reveal it or the test area is clipping it.

**Success criteria** — The summary shows whether the stage clips the canvas
and whether the canvas is within the browser viewport. The copied report
agrees with the summary in both cases.

**Step and checkpoint** — Measure the canvas against both the stage and the
viewport. In the calibration screen, use a short browser window and scroll
until a canvas that fits its stage is partly outside the viewport. Verify
that the summary shows partial visibility and that the canvas fits the stage.
Scroll it back into view. Then set a manual width larger than the stage and
verify that the summary shows stage clipping. In each case, compare the copied
report with the on-screen summary.

The [diagnostics workbench spec](../apps/diagnostics/docs/specs/diagnostics-workbench.md#measurements-and-reports)
keeps the resulting behavioral commitment.

## Maintain and close the plan

Check the plan against the repository before resuming. As work progresses,
check off steps after their checkpoints pass, record significant decisions
and their rationale, and keep the next action current. Record actual evidence,
including failures and pending checks with the browser, device, or fixture
needed to run them.

Before closing, check the objective against the observed results and call out
any unmet criteria or remaining verification gaps. Keep actionable follow-up
visible when work is deferred. Transfer lasting decisions to the appropriate
spec or architecture document. Keep a useful summary of the verification in
the change description, then delete the completed plan. Retain a completed
plan only for a specific historical reason.
