# Add touch controls to Very Angry Robots

## Objective

Make every Very Angry Robots screen usable on touch devices without a keyboard
or gamepad, while preserving existing keyboard and standard-mapped gamepad
play.

**Success criteria**

- In landscape, two virtual sticks appear over opposite lower sides of the play
  area. In portrait, they appear below the 4:3 play area.
- The left stick moves in eight directions. The right stick aims and fires in
  eight directions while held; movement and aiming work at the same time.
- Touch alone can start and navigate the menu screens, pause and resume, enter
  and submit initials, and operate Settings.
- Pointer cancellation, focus loss and screen changes release held touch input.
  Two pointers work independently and browser gestures do not interrupt an
  active control interaction.
- The app tests and the landscape/portrait manual walkthroughs pass, including
  checks for control visibility, page scrolling and gameplay readability.

## Scope and references

Implement the accepted [touch-controls specification](../docs/specs/touch-controls.md).
Preserve the existing movement, aim and fire behavior in
[core gameplay](../docs/specs/gameplay.md), pause and focus behavior in
[pause and display settings](../docs/specs/pause-and-display-settings.md), and
the initials and attract-screen flow in
[high scores and attract screens](../docs/specs/high-scores.md).

Input remains app-owned. `src/game.ts` stays independent of browser events and
input devices; `src/main.ts` remains the integration point for input, screen
flow, focus policy and rendering, as described in the
[app architecture](../docs/architecture.md).

## Work

- [x] **Add a testable touch-input model.** Start from `src/input.ts` and its
  tests. Track each stick by its active pointer, derive direction from
  displacement from the neutral center with a neutral zone, and quantize to the
  same eight directions used by existing controls. Produce movement and aim
  inputs independently, preserve aim when the right stick is neutral, and
  release only the pointer whose interaction ended. Confirm it handles
  simultaneous pointers, neutral-zone transitions, release and cancellation
  without DOM dependencies.
- [x] **Connect browser pointer and screen actions.** In `src/main.ts`, capture
  the pointers used by gameplay controls and feed the touch model into the
  existing per-frame input and screen-flow paths. Clear touch state on
  `pointercancel`, lost capture, blur, visibility loss, and screen or pause
  transitions. Make menu start/navigation, pause/resume, initials selection,
  correction and submission operable by touch; retain the existing pointer
  interaction for Settings. Confirm a held touch cannot leak into a new screen
  or resume gameplay after focus returns.
- [x] **Add responsive touch controls.** Update `index.html` and `src/style.css`
  for the two stick surfaces: overlay them on opposite lower sides of the play
  area in landscape, and put them after the play area in portrait. Keep targets
  legible at phone sizes, avoid covering important game information in
  landscape, and scope browser-gesture suppression to active control
  interactions so page scrolling remains available elsewhere. Show controls on
  touch-capable devices and retain the existing keyboard/gamepad instructions
  and controls.
- [ ] **Verify the full touch path.** Add focused tests for the touch-input
  model and pointer lifecycle, then run `npm run test --workspace=very-angry-robots`
  and `npm run build:robots` from the repository root. Manually walk through
  start/navigation, simultaneous move and fire, pause/resume, initials and
  Settings on touch hardware in landscape and portrait. Confirm controls sit
  in the specified position, touch cancel and focus loss release input, page
  scrolling works outside controls, and the game remains readable. Record
  unavailable hardware or failed scenarios as open verification gaps.

## Verification

Step 1 checks passed:

- `node --disable-warning=ExperimentalWarning --experimental-strip-types --test src/input.test.mjs`
  from `apps/very-angry-robots` — 17 tests passed, including the new touch
  model scenarios.
- `npm run check --workspace=very-angry-robots` — TypeScript check passed.

Step 2 checks passed:

- `npm run test --workspace=very-angry-robots` — 117 tests passed.
- `npm run check --workspace=very-angry-robots` — TypeScript check passed.

The production build and landscape/portrait device walkthroughs have not been
run. The browser event integration and responsive control layout have not yet
been exercised on touch hardware.

## Next action

Add focused tests for pointer lifecycle, run the app test suite and production
build, then complete the landscape and portrait touch walkthroughs.
