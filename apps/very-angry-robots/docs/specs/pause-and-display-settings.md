# Pause and display settings

**Status: Accepted. Implementation: Present. Automated coverage: Passed for
pause and focus state gates, transition and death interval suspension, attract
timer suspension, input isolation, display-profile validation and storage, and
settings selection, bounded value adjustment, reset, pointer interaction, and
audio preference updates. Keyboard and gamepad browser-event integration and
responsive viewport behavior are not covered by automated tests. The user
reports manual checking as far as they can; exact coverage is not recorded.**
The shared display profile and its valid values are defined by the
[vector display specification](../../../../packages/one-more-glow/docs/specs/SPEC.md#global-display-profile-options).

## Pause

- During a run, let the player pause and resume with P on the keyboard or
  Gamepad Start. Ignore keyboard auto-repeat; treat Start as a discrete press.
  Show the pause and resume controls on the applicable screens.
- Pausing freezes the room, player, robots, shots, effects, score and all
  gameplay timers. This includes the Captain's lurk and pursuit, death and
  respawn intervals, and room scroll and door animations. Resuming continues
  from the paused state without resetting it.
- Losing browser focus while a run is active pauses it and clears held keyboard
  input. Returning focus does not resume automatically; require an explicit
  resume input. A pause that was already active remains paused.
- Pause is available during active play and room transitions, including a
  death interval before respawn. It is not an action on the Main Menu, Top
  Scores, initials-entry or game-over flow screens.

## Display settings

Show a Settings shortcut on the Main Menu, Top Scores and pause screens. Use S
on the keyboard and the standard gamepad Back/Select button. Settings cannot be
opened during active play, a room transition, a death or respawn interval, or
initials entry; pause a run first. Draw a dedicated settings screen in the
existing canvas with the app's vector style and a representative room preview.
Do not draw the active game world or HUD behind the settings controls.

Provide labelled, visibly selected controls and numeric values for each public
display-profile field:

| Control | Range | Default |
| --- | --- | --- |
| Line width (CSS pixels) | 0.5–4 | 1 |
| Point radius (CSS pixels) | 0.5–4 | 1 |
| Glow strength | 0–2 | 0.2 |
| Glow spread | 0.5–2 | 1 |

Use adjustments fine enough for practical visual tuning; 0.1 increments are a
starting point. Provide a reset action that restores these defaults and updates
the controls and preview immediately. Apply the profile to all vector drawing,
including the game, HUD and text. It does not change gameplay, geometry,
colours or per-object intensity. Do not expose display effects that are not part
of the accepted shared profile.

Settings must work with pointer, keyboard and a standard-mapped gamepad. On the
keyboard, Up and Down select controls, Left and Right adjust values, Tab and
Shift+Tab move through settings controls, and Escape closes the screen. Provide
clear reset and close actions for pointer and keyboard. Opening settings
selects its first control. Closing returns to the screen from which it opened;
a paused run remains paused until explicitly resumed. Pause the Main Menu or
Top Scores alternation timer while settings are open and continue its remaining
time when settings close.

While settings are open, freeze gameplay and its timers. Keep rendering the
representative preview without advancing the simulation. Apply adjustments to
the next rendered frame. Settings input must not start, restart, resume or
control the game. Clear or consume held and discrete inputs at screen
transitions so closing settings cannot trigger an unintended game action; a
fresh press is required. If focus is lost while settings are open, retain the
originating screen and pause state, clear held keyboard input, and do not
resume a run when focus returns.

Keep the selected profile across screens and browser reloads using local
storage. Use the defaults in the table when there is no saved profile. Treat
unavailable storage, malformed data and values outside the shared profile's
valid ranges as non-fatal: use the defaults for invalid saved data, and allow
settings changes and play for the current session if saving fails. Reset also
replaces the saved profile when storage is available. This preference is
separate from high scores and does not change the shared library defaults.

The app owns the settings interface and preference. Configure the renderer
through its public display-profile API. Continue drawing through
`DrawingContext`; do not expose renderer-specific configuration as drawing
state or import renderer internals. No shared settings framework or gameplay
rule changes are required.

### Verification scenarios

- Pause and resume active play, room transitions and death intervals from both
  keyboard and gamepad. Confirm gameplay entities and timers stay fixed, then
  continue from the same state.
- Lose focus during play and while paused. Confirm held input is cleared and
  focus returning does not resume gameplay.
- Open settings from Main Menu, Top Scores and pause. Confirm it is unavailable
  from active play, transitions, death/respawn and initials entry; the preview
  is visible and gameplay or attract-screen timing does not advance.
- Change each profile value and see the result immediately throughout the game.
  Close and reopen settings; confirm the selected profile remains. Reset and
  confirm all four defaults are restored.
- Use pointer, keyboard and gamepad to select, adjust, reset and close settings.
  Confirm settings input does not leak into start, restart or resume actions.
- Lose focus with settings open and return. Confirm the originating screen and
  paused state are retained. Verify session tuning and play continue with
  unavailable storage or an invalid saved profile.
- Check settings controls and preview at narrow and wide viewport sizes.
