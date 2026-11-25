# Diagnostics game input package

## Objective

Migrate diagnostics' custom input handling to the shared `@one-more-glow/game-input`
package while preserving the accepted keyboard and standard-gamepad behavior.

**Success criteria**

- Diagnostics consumes keyboard and standard-mapped gamepad state through one
  `InputDevices` owner from the package's public export.
- Native Tab navigation and control behavior remain browser-managed. Escape,
  gamepad focus movement, activation, back, screen switching, numeric editing,
  select editing, focus recovery and held-input gating retain their current
  behavior.
- Disconnect and reconnection, including browser gamepad-index reuse, do not
  carry held-button state into a new connection.
- Diagnostics checks/build and input behavior verification pass, with evidence
  recorded in the workbench spec or change description.

## Scope and references

- Update diagnostics input integration, beginning in `apps/diagnostics/src/main.ts`;
  use an app-owned adapter or extracted input module only if it makes connection
  lifecycle and event/frame handling easier to verify.
- Add `@one-more-glow/game-input` as a diagnostics workspace dependency.
- Preserve the accepted [diagnostics workbench input contract](../../docs/specs/diagnostics-workbench.md#input-and-presentation)
  and the [game-input device-frame contract](../../../../packages/game-input/docs/specs/SPEC.md).
- Keep native keyboard focus and activation, gamepad-to-control mapping,
  direction repeat, axis thresholds, neutral gating, edit modes and UI actions
  owned by diagnostics. The package provides device state, not UI actions or
  axis policy.
- Do not change controls help or user-visible mappings unless implementation
  reveals a behavior change that needs correction.

## Work

- [x] **Integrate the device-state owner.** Add the package dependency and
  adapt DOM keyboard events and standard-mapped Gamepad API snapshots into
  `InputDevices`. Generate a new connection token for each observed controller
  connection; do not treat a reusable browser index as a persistent identity.
  Read one device frame per poll and use its button held/pressed state for
  navigation and edit actions. Preserve the existing first-controller,
  standard-mapping policy and app-owned axis/neutral/repeat behavior.
  **Checkpoint:** `npm run check --workspace=diagnostics` passes and review
  confirms package imports use its public entry point only.
- [ ] **Preserve lifecycle and keyboard behavior.** Route custom Escape
  handling through the shared keyboard state where compatible with synchronous
  browser default prevention. Clear keyboard state on focus loss; reset or
  suppress controller state at blur, hidden-page, disconnect, reconnect and
  neutral-gate boundaries so held controls do not fire after recovery.
  **Checkpoint:** the Nov 25 browser walkthrough confirmed native Tab/Return
  navigation between both screens and Escape closing Controls help. Focused
  tests cover keyboard Escape state, held-button suppression and reconnect
  tokens. Held-axis gating, focus return after lifecycle loss, and behavior
  with a connected controller still need an integrated controller walkthrough.
- [ ] **Document and verify.** Update diagnostics' input verification notes
  with the actual scenarios and outcomes. Run
  `npm run check --workspace=diagnostics`,
  `npm run test --workspace=diagnostics`, and
  `npm run build --workspace=diagnostics`; use the repository's available
  browser setup to verify gamepad navigation, editing, screen switching and
  lifecycle recovery.
  **Checkpoint:** checks and build pass; the workbench spec records the Nov 25
  keyboard walkthrough and notes that gamepad behavior was not rechecked
  because no standard-mapped controller was connected. Gamepad navigation,
  editing and lifecycle recovery remain to be exercised in the browser.
- [ ] **Close the plan.** Apply the closure rule in `plans/README.md` before
  reporting completion or preparing a PR: confirm every success criterion,
  transfer lasting behavior changes to the spec, record verification evidence,
  and remove this completed plan in the same change.

## Verification

Passed: `npm run build:libraries`,
`npm run check --workspace=diagnostics`,
`npm run test --workspace=diagnostics` (12 tests),
`npm run build --workspace=diagnostics`, and `npm run check:boundaries`.
The local verification tree was `dbbaf83a3c70525c1f2e2895781fd7f4e1cd978e`;
the tree matched before and after the diagnostics checks/build.
The `device-input.test.ts` cases cover keyboard Escape state, initial and
reconnected held-button suppression, fresh connection tokens, standard-pad
selection and axis passthrough. Browser walkthrough and physical-controller
verification remain outstanding; do not claim those from deterministic tests.

## Next action

When a standard-mapped controller is available, use the local browser to verify
gamepad navigation, activation, editing, screen switching, held-input gating,
and disconnect/reconnect recovery. Then update the evidence and close the plan
only after all success criteria are met.
