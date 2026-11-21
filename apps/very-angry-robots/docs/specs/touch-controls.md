# Touch controls

## Scope and status

**Status: Accepted. Implementation: Complete.** On touch devices, provide twin
virtual sticks beside the play area in landscape, and place them below the play
area in portrait. Every game screen must be usable without a keyboard or
gamepad.

Make Very Angry Robots playable on touch devices without requiring a keyboard
or gamepad. Retain the existing keyboard and standard-mapped gamepad controls.
Touch input belongs to the app and feeds the same movement, aim, fire and screen
actions as the existing input methods; it does not change game simulation rules.

## Touch behavior

- On touch-capable devices, show two directional controls during gameplay. In
  landscape, center the 4:3 play area and place the sticks in separate side
  rails so they do not cover it. Size the play area and rails to fit the
  available viewport; when landscape is too narrow for usable side targets,
  place the sticks below the play area. In portrait, place them underneath the
  play area so they do not cover the game.
  Derive each control's direction from the touch displacement relative to its
  neutral center, with a neutral zone around that center. The left control moves
  the player; the right control aims and fires in the same eight directions as
  the keyboard and gamepad. Movement and aiming remain independent and may be
  used at the same time.
- Treat the right control as held fire: firing repeats while it has a non-zero
  direction and stops when released. Preserve the last aim direction for the
  player's facing when the right control returns to neutral.
- Allow simultaneous independent touch pointers on the two controls. Map touch
  coordinates consistently when the controls or canvas are scaled to fit the
  viewport. A pointer's position is interpreted relative to its control's
  neutral center, not as a game-world or canvas coordinate.
- Provide touch actions to start a run from Main Menu or Top Scores, switch
  between those attract screens, and pause or resume play. Show clear actions
  for these on-screen prompts; in particular, provide a pause action during
  play and a resume action while paused.
- Make initials entry possible by touch, including character selection,
  correction, and submission. On the initials screen, use the left stick's
  horizontal flick to move the selected slot and the right stick's vertical
  flick to cycle its character. Each stick produces one step per flick and
  rearms after returning to neutral. Taps may also select and cycle initials;
  lower-screen tap areas correct and submit. Existing pointer-operated
  Settings controls remain available to touch.
- Release held touch input on pointer release or cancellation, loss of pointer
  capture, browser focus loss, and screen transitions. A stale touch must not
  move or fire after returning to the game or resuming play.
- Keep touch targets and gameplay legible at narrow and wide viewport sizes.
  In landscape, controls must not obscure the play area. In portrait, place the
  4:3 play area above the controls and allow the page to scroll when the full
  layout cannot fit vertically.
- Hide the HTML page header, footer instructions and hazard hint under the same
  primary touch-input condition used to show the thumbsticks: `(hover: none) and
  (pointer: coarse)`. Keep the title and prompts drawn in the game, touch-stick
  labels and their accessible names available. On hybrid devices this follows
  the browser's choice of primary pointing device.
- Prevent browser gestures from interrupting an active gameplay touch gesture
  while preserving normal page scrolling outside the game interaction.

## Verification scenarios

- On a touch device, start a run and move in all eight directions. Aim and hold
  fire in all eight directions, release to stop firing, and move and fire at
  once.
- Drag each control beyond its initial touch point and outside its visible
  control area. Confirm pointer capture keeps input stable and that releasing
  either pointer only releases its own action.
- Cancel a pointer, lose focus, pause, or change screens while a control is
  held. Confirm movement and firing stop and do not resume until a fresh touch.
- Start from Main Menu and Top Scores, switch attract screens, pause and resume,
  enter and submit initials (including correction), and open, operate and close
  Settings using touch alone.
- Check controls in landscape in the side rails and in portrait below the play
  area; also check that narrow landscape falls back below the play area. Confirm
  browser scrolling and zoom gestures remain available outside active control
  interactions.

## Verification status

- `npm run test --workspace=very-angry-robots` passed with 119 tests, including
  touch cancellation, independent pointer release and clearing active touch
  input.
- `npm run build:robots` passed for the shared package and Very Angry Robots.
- The user reports verifying touch behavior on a Motorola Edge 30 phone and a
  Samsung Galaxy Tab S9 FE tablet.
- After the page header/footer and landscape grid-placement changes, the
  developer reports checking the updated layout on a touch tablet and phone
  and finding it good.
