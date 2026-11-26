# Migrate Gyruss to @one-more-glow/game-input

## Objective

Replace Gyruss's inline keyboard and gamepad state tracking with the public
`@one-more-glow/game-input` package. Keep the existing controls and input
behavior; this migration is not a request to change keyboard-layout semantics.

**Success criteria**

- Gyruss no longer owns a `pressedKeys` set or reads browser gamepad buttons
  directly for gameplay. It adapts browser snapshots and uses one
  `DeviceInputFrame` per animation frame for all game decisions and drawing.
- Existing keyboard, controller, restart, HUD, and focus-loss behavior is
  preserved, including value-based A/D/Z keyboard mappings and use of only the
  first connected controller for gameplay.
- The public package entry point is used. Deterministic tests cover the app's
  mapping and controller lifecycle behavior.
- `npm run check:gyruss`, the Gyruss workspace tests, and `npm run check` pass.
  A browser walkthrough verifies the controls where a standard browser
  Gamepad API/controller setup is available; unavailable hardware is recorded
  as a verification gap, not as a passed check.

## Scope and references

- `apps/gyruss-demo/src/main.ts` — replace inline keyboard and gamepad tracking.
- New `apps/gyruss-demo/src/input.ts` — app-owned browser adapter and Gyruss
  mapping, following the public-package boundary used by Asteroids.
- New `apps/gyruss-demo/src/input.test.mjs` — deterministic adapter and mapping
  tests.
- `apps/gyruss-demo/package.json`, root `package.json`, and root `README.md` —
  dependency, test command, workspace test inclusion, and command documentation.
- `docs/architecture.md` and `packages/game-input/docs/specs/SPEC.md` — record
  Gyruss as a Game Input consumer and add its integration verification scenario.

References: [Game Input specification](../../../../packages/game-input/docs/specs/SPEC.md),
[Gyruss gameplay specification](../../docs/specs/SPEC.md),
[repository architecture](../../../../docs/architecture.md), and
[plan closure guidance](../../../../plans/README.md#maintain-and-close-the-plan).

### Existing behavior to preserve

These behaviors are based on the current Gyruss implementation and README;
changing them is outside this migration's scope unless the developer explicitly
requests it.

- Keyboard mappings use normalized `event.key` values, not physical `code`:
  `a`/`d` and Left/Right turn; Space, ArrowUp, and `z` fire. R restarts only
  after game over. Preserve the mapping on non-US layouts; do not silently
  switch to physical-key bindings to match other games.
- Keyboard turn is `Number(right) - Number(left)`. Controller turn is the
  first connected controller's axis 0 when `abs(axis) > 0.16`, otherwise its
  D-pad direction (`button 15 - button 14`). Add controller turn to keyboard
  turn, then clamp the result to `[-1, 1]`.
- Fire is held state: keyboard Space/ArrowUp/Z or button 0 on the first
  connected controller. The first connected controller is selected in browser
  enumeration order, without filtering by mapping. Other connected controllers
  do not contribute gameplay input.
- The HUD says "CONTROLLER CONNECTED" if any connected controller exists;
  otherwise it says "KEYBOARD READY".
- Window blur clears keyboard state. It does not pause the game. Preserve the
  existing restart-button click behavior.

## Work

- [ ] **Implement `apps/gyruss-demo/src/input.ts`.** Wrap `InputDevices` behind
  app-owned keyboard event methods and a `read(gamepads)` adapter. Preserve
  `event.key` values for the mapping above while passing the event's code to the
  shared tracker where available. Create snapshots for connected browser
  gamepads, preserving browser enumeration order and the current first-pad
  gameplay policy. Track each browser index with its `id`, `mapping`, and
  connection token; issue a fresh token when identity/mapping changes, and
  forget indices absent from a poll. Also expose an explicit index-invalidation
  method for browser connection events. `gameplay(frame)` maps a frame to the
  current gameplay values, including a restart press edge and the any-pad HUD
  connection flag. Keep axis thresholds and action policy in this app.
  **Checkpoint:** `npm run check:gyruss` passes; the adapter imports only the
  public `@one-more-glow/game-input` entry point.
- [ ] **Rewire `apps/gyruss-demo/src/main.ts`.** Route keydown/up through the
  adapter; keep `preventDefault` limited to the existing gameplay keys. On
  blur, clear keyboard tracking. Listen for `gamepadconnected` and
  `gamepaddisconnected` and invalidate the affected index so a disconnect and
  reconnect between animation-frame polls cannot reuse stale button history.
  Each animation frame reads `navigator.getGamepads?.() ?? []` once, derives
  gameplay once, and reuses that result for update and drawing. Consume R as a
  fresh edge only while game over; leave the restart button intact. Remove
  `pressedKeys`, `readInput`, and direct gamepad decision logic.
  **Checkpoint:** `npm run check:gyruss` passes.
- [ ] **Wire the workspace dependency and test command.** Add
  `@one-more-glow/game-input` to `apps/gyruss-demo/package.json`, install from
  the root to update `package-lock.json`, add the Gyruss test script, and
  include the workspace in the root `test` script. Add the command to the
  root README check/test table.
  **Checkpoint:** the dependency resolves through the package entry point;
  `npm run check:gyruss` passes.
- [ ] **Add deterministic adapter/mapping tests.** Cover: each existing keyboard
  turn/fire mapping and key release; combined opposing keyboard inputs;
  keyboard-plus-controller turn and clamping; strict axis threshold behavior
  just below, at, and above 0.16; D-pad directions and stick-over-D-pad
  precedence; held button 0 fire; R produces one edge and auto-repeat does not;
  the first controller drives gameplay
  while any controller drives the HUD flag; identity/mapping changes and
  disappearance produce fresh connection history; disconnect/reconnect events
  between reads produce a fresh token even when the browser reuses an index;
  and a button held on first observation stays suppressed until release and a
  fresh press. Use `node:test` and `node:assert/strict`, following existing
  workspace test conventions.
  **Checkpoint:** `npm run test --workspace=gyruss-demo` passes.
- [ ] **Update architecture and shared consumer documentation.** Add Gyruss to
  the Game Input dependency diagram and consumer list. Add a Gyruss integration
  verification scenario that describes the preserved mapping and lifecycle
  behavior. Do not convert the reverse-engineered Gyruss baseline into an
  accepted design decision as part of this migration.
  **Checkpoint:** `npm run check:repo-conventions` passes and the documented
  dependency direction remains apps → public package entry point.
- [ ] **Run end-to-end checks and close the plan.** Run `npm run check` and
  record the checked tree and outcomes. Perform the browser walkthrough below
  when suitable browser/controller setup is available. Apply the closure rule
  in `plans/README.md` before reporting completion or preparing the final PR;
  keep this plan active if a criterion, decision, or material verification gap
  remains unresolved.

## Verification

- Automated: `npm run check:gyruss`, `npm run test --workspace=gyruss-demo`,
  `npm run check:repo-conventions`, and `npm run check`. Record commands,
  outcomes, and the verification tree under the repository's verification
  evidence rule.
- Browser walkthrough: run `npm run dev:gyruss`. Verify Left/Right and A/D
  turn, Space/ArrowUp/Z fire, and R restarts only after game over; check held
  inputs stop on key release and blur clears keyboard input without pausing.
  With two controllers if available, confirm the first enumerated controller
  drives gameplay while either connected controller keeps the HUD connected.
  Test stick and D-pad turning and button 0 fire. Connect while holding button
  0 and confirm first-observation suppression until release and a fresh press.
  Disconnect/reconnect between polls if the setup permits and verify stale
  held-button state does not return. Record the browser, setup, scenarios, and
  observations. If controller hardware or a suitable browser is unavailable,
  state that gap explicitly.

## Next action

Implement the adapter in `apps/gyruss-demo/src/input.ts`, preserving the
current normalized `event.key` mappings. Include browser connection-event
invalidation in the adapter design from the start; do not defer it to a
best-effort polling check.
