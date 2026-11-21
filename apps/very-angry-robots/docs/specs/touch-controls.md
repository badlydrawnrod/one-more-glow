# Touch controls

## Scope and status

**Status: Accepted. Implementation: Partial.** On touch devices, provide twin
virtual sticks in landscape, and place them below the play area in portrait.
Every game screen must be usable without a keyboard or gamepad.

Make Very Angry Robots playable on touch devices without requiring a keyboard
or gamepad. Retain the existing keyboard and standard-mapped gamepad controls.
Touch input belongs to the app and feeds the same movement, aim, fire and screen
actions as the existing input methods; it does not change game simulation rules.

## Touch behavior

- On touch-capable devices, show two directional controls during gameplay. In
  landscape, place them over opposite lower sides of the play area. In portrait,
  place them underneath the play area so they do not cover the game.
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
  correction, and submission. Existing pointer-operated Settings controls
  remain available to touch.
- Release held touch input on pointer release or cancellation, loss of pointer
  capture, browser focus loss, and screen transitions. A stale touch must not
  move or fire after returning to the game or resuming play.
- Keep touch targets and gameplay legible at narrow and wide viewport sizes.
  In landscape, controls must not obscure important game information. In
  portrait, place the 4:3 play area above the controls and allow the page to
  scroll when the full layout cannot fit vertically.
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
- Check controls in landscape over the play area and in portrait below it.
  Confirm browser scrolling and zoom gestures remain available outside active
  control interactions.
