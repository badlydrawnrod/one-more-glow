# Asteroids: gameplay

This specification preserves the original Asteroids-style flight baseline and
records the accepted complete-game refresh. See [README.md](../../README.md) for how
to run and control the game.

## Previous flight baseline

- This describes the prototype before the accepted refresh; it is historical
  context, not the current implementation target.
- The player steers a spacecraft and applies forward thrust in a free-flight
  arena. The ship starts at rest in the centre, facing upward.
- Thrust accelerates the ship in its facing direction. Turning changes its
  heading without immediately changing its direction of travel; the ship
  continues to drift, gradually slows under drag, and has a maximum speed.
- The ship and asteroids wrap around the arena's horizontal and vertical
  edges, with visible copies when their outlines cross an edge.
- Five irregular asteroids drift and rotate in a stationary star field. The
  ship, asteroids and stars use glowing vector geometry; a flickering flame
  appears while thrust is engaged.
- The in-screen HUD uses the library's segmented vector text for its sector
  label, speed, thrust state, input connection status and flight label. Speed
  is shown as a three-digit rounded magnitude; thrust reads `THRUST ENGAGED`
  or `THRUST OFF`; input status reads `CONTROLLER CONNECTED` when a connected
  gamepad is detected and `KEYBOARD READY` otherwise.

The previous prototype had no firing, collision effects, score, lives or
game-over state. Those mechanics are specified in the accepted refresh below.

## Accepted refresh: complete game

**Implementation: Implemented.** Values identified as starting points remain
subject to playtesting; the deferred capabilities below are not included.

The following design is **accepted**.

### Goal and flow

Survive as long as possible and score points by destroying asteroids and enemy
saucers. Clear all asteroids to advance to the next, harder wave. Waves continue
indefinitely; the run ends when the last life is lost.

- A title screen highlights One More Glow and Asteroids with prominent vector
  lettering, explains the controls and offers start. Start
  resets the score, lives, wave and transient state. Begin wave 1 with three
  lives, including the ship in play, and briefly display each wave number.
- When the last asteroid is destroyed, remove the saucer and all shots, then
  start the next wave after a two-second intermission. The ship keeps its
  position, velocity and remaining lives as the intermission begins, and remains
  controllable: the player can turn, thrust, fire and use available hyperspace.
  Intermission shots continue moving and expiring; clear any remaining shots
  when the next wave starts.
- After the final death, show game over, final score and a restart prompt. A
  fresh press is required; holding start through the transition cannot restart.
  Return to the title screen after ten seconds, or sooner on a fresh Escape or
  gamepad B press. A fresh Enter or gamepad Start press restarts immediately.
- Pause freezes gameplay and gameplay timers. Browser focus loss also pauses
  and clears held keyboard input; resuming requires an explicit action. Title
  and game-over screens remain usable.

### Controls and flight

Support both keyboard and standard-mapped browser gamepads throughout:

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Rotate | Left/Right arrows or A/D | Left stick horizontal or D-pad left/right |
| Thrust | Up arrow or W | Left stick up, D-pad up or first face button |
| Fire | Space | Second face button |
| Hyperspace | Shift | Third face button |
| Start / pause / resume | Enter / P / P | Start button |

Start, pause and hyperspace use discrete presses; fire may be held. Ignore
keyboard auto-repeat for discrete actions. Preserve the current analog steering
dead zone and allow keyboard and gamepad without a mode switch. Show controls
on the title screen and the applicable pause or restart action when relevant.

Keep the current rotation, thrust, momentum, mild drag and speed limit as the
starting flight feel. The ship starts at rest in the centre, facing up. The
rectangular playfield wraps on both axes: ship, asteroids and shots reappear at the opposite edge. Saucers wrap
vertically but leave at a horizontal edge as described below. Rendering and
collisions agree across edges and corners wherever objects wrap.

The ship fires from its nose up to five times per second while fire is held.
Shots inherit ship velocity, travel faster than the ship, wrap and disappear on
impact or after 1.2 seconds. At most four player shots may be active; firing at
the limit has no effect until a slot is free. Player shots cannot damage the
player or other player shots.

Hyperspace immediately moves the ship to a random position, resets its velocity
and preserves its heading. It has a five-second cooldown shown in the HUD, and
cannot be used while dead, respawning, paused or invulnerable. The destination
is not guaranteed safe: check collision immediately after arrival. An attempt
during cooldown does nothing.

### Asteroids and collisions

Each wave starts with large asteroids at least one quarter of the shorter
playfield dimension from the ship, measured across wrapping edges. Give them
varied outlines, headings, speeds and rotation; their initial positions must not
overlap the ship.

There are large, medium and small asteroids. When destroyed, a large asteroid
splits into two medium, a medium into two small, and a small disappears.
Children emerge at the parent position, move apart in distinct directions and
are faster than their parent. Asteroids do not damage one another.

A player shot destroys the first asteroid or saucer it hits and is consumed.
The ship is destroyed by contact with an asteroid, saucer or saucer shot. A
saucer is destroyed by a player shot, asteroid or ship. A saucer shot is
consumed by the first ship or asteroid it hits; it cannot damage its own
saucer. Asteroids split regardless of what destroys them. Only player shots
award points. Resolve simultaneous contacts consistently: each projectile is
consumed at most once, each target is destroyed at most once, and the ship
loses at most one life per update.

### Lives and respawning

When the ship is destroyed, remove it and its active shots, show a brief vector
explosion and deduct one life. If lives remain, wait two seconds before
attempting to respawn at the centre, at rest and facing up. Delay respawn
while an asteroid, saucer or saucer shot is within one tenth of the shorter
playfield dimension of the centre, measured across wrapping edges. Show that
respawn is waiting for a safe area; the rest of the world keeps moving.

Once clear, respawn with two seconds of visible invulnerability. The ship can
move and fire, but contact does not destroy it or the object it touches. If no
lives remain, enter game over after the explosion instead of respawning.

### Enemy saucers

During active waves, periodically spawn one saucer at a time at a random
horizontal edge and height. It travels across the field, occasionally changes
vertical direction, fires at the player, and leaves after crossing the field or
15 seconds, whichever comes first. It may wrap vertically. Start a new spawn
delay when a saucer is destroyed or leaves. Do not spawn during intermission,
while the ship is absent, or after game over; freeze the delay while the ship
is absent.

Large saucers fire in random directions. Small saucers aim near the ship, with
some error to keep shots avoidable. Saucer shots travel in straight lines, wrap
and expire after two seconds. Saucers do not fire while the ship is absent;
existing shots remain dangerous until they expire or a wave transition clears
them.

### Score and difficulty

| Player-shot target | Points |
| --- | ---: |
| Large / medium / small asteroid | 20 / 50 / 100 |
| Large / small saucer | 200 / 1,000 |

Award an extra life each time the score crosses a multiple of 10,000, including
multiple thresholds crossed by one score change. Display score, remaining lives
and wave during play. Store the highest current or completed run score in
browser local storage when available; play must still work if storage is
unavailable. Show the high score on the title and game-over screens.

Difficulty increases with wave number `n`, starting at 1. Cap the settings so an
indefinitely long run remains playable:

| Parameter | Accepted progression |
| --- | --- |
| Large asteroids at wave start | `min(4 + n - 1, 12)` |
| Starting asteroid speed | Wave 1 baseline multiplied by `min(1 + 0.08 × (n - 1), 2)` |
| Time between saucer appearances | `max(20 - (n - 1), 8)` seconds |
| Chance of a small saucer per appearance | `min(10% + 5% × (n - 1), 70%)` |
| Saucer firing interval | `max(2 - 0.1 × (n - 1), 0.8)` seconds |

Choose movement speeds and aiming error through playtesting: wave 1 should give
the player time to react, and later waves should be more demanding without
unavoidable spawn collisions. Once all caps are reached, subsequent waves use
the capped settings. Start the saucer appearance delay at each wave's start.

Initial implementation tuning uses the existing flight model's 3.4 rad/s
rotation, 175 units/s² thrust, 0.992 per-frame drag at 60 Hz and 360 units/s
speed limit. Wave 1 large asteroids start at 20–44 units/s; large and small
saucers start at 48 and 68 units/s. Small-saucer aim varies by up to 0.18
radians. Treat these as playtest starting values, not new progression rules.

### Presentation and boundaries

Retain the glowing vector aesthetic, star field, ship thrust flame and segmented
text. Give asteroids angular, irregular outlines with a pronounced indentation
to suggest rocky silhouettes. Distinguish asteroid sizes, saucer sizes, player and enemy shots, ship
destruction and respawn protection. Keep the HUD readable without obscuring the
playfield. Adapt the canvas to available space while preserving the playfield
aspect ratio and consistent gameplay coordinates.

Gameplay and input remain app-owned. Draw through One More Glow's public API
and renderer-independent `DrawingContext`; do not put game rules into the
library or depend on renderer internals. The game must be playable with either
keyboard or gamepad without requiring audio. Audio, multiplayer, touch controls,
configurable bindings and online leaderboards are deferred.

### Acceptance scenarios

- Starting, pausing, resuming and restarting work with each supported input;
  focus loss cannot leave the ship thrusting or firing in the background.
- Shooting each asteroid size produces the correct split and score; shooting a
  saucer awards its score. Non-player destruction never awards points.
- Objects and shots interact correctly across edges and corners; simultaneous
  contacts cannot score twice or cost multiple lives.
- Death, blocked respawn, invulnerability, game over and fresh run follow the
  rules above. Hyperspace obeys its cooldown and can land in danger.
- Clearing a wave advances exactly once and applies the next wave's settings;
  progression reaches its caps and continues. Extra lives work at thresholds.
- Saucer spawning, firing, departure and cleanup follow their timers, and pause
  freezes those timers. High score survives reload when storage works.

## Accepted: live display settings

**Status: Accepted.** Shared profile semantics and valid values are defined by
the [vector display specification](../../../../docs/specs/vector-display.md#global-display-profile-options).

**Implementation: Implemented.**

### Experience

Show the S keyboard and gamepad Back/Select shortcuts for Settings on the title
and pause screens. Settings cannot be opened during active play, intermission,
or game over; a player can pause a run first. Show the
settings controls on a dedicated screen inside the game canvas using its vector
aesthetic, with a representative game-like preview scene. Do not draw the game
world or HUD behind the settings controls. Prioritize clear, usable controls and
a visible preview within the existing canvas.

The visible sliders, current values, reset action and close action are drawn in
the canvas. Pointer hit areas operate those controls directly, and the app owns
the selected control and its input handling. Highlight the selected control in
the canvas.

While settings are open, freeze gameplay and its timers. Keep rendering a
representative preview without advancing the simulation. Adjustments apply to
the next rendered frame immediately and remain in effect when settings are
closed. Closing settings returns to the
screen from which it was opened; a paused run stays paused until the player
explicitly resumes. Focus loss retains the existing pause and input-clearing
behavior and must not resume a run when focus returns.

Provide labelled controls with a visible numeric value for each of the four
public display-profile fields:

| Control | Range | Default |
| --- | --- | --- |
| Line width (CSS pixels) | 0.5–4 | 1.0 |
| Point radius (CSS pixels) | 0.5–4 | 1.0 |
| Glow strength | 0–2 | 0.2 |
| Glow spread | 0.5–2 | 1 |

Use adjustments fine enough to make visible tuning practical; 0.1 increments
are the proposed starting point. Provide a reset action that immediately
restores the Asteroids defaults in the table and updates the controls and preview. The
profile applies globally to the game's vector drawing, including its HUD and
text. It does not change gameplay, geometry, colours or per-object intensity.
Do not expose brightness, persistence or other effects that are not part of
the accepted profile.

### Input, preferences and boundaries

Settings must be operable by pointer and keyboard, with Up and Down selecting
controls and Left and Right adjusting values. Tab and Shift+Tab cycle through
the settings controls while settings are open; Escape closes them. Show labels,
values and the selected control. Support navigating,
adjusting, resetting and closing settings with a standard gamepad as well, so
players can use either of the game's supported input methods. Opening settings selects its first control; closing it returns to the game screen. While settings are open, inputs used to interact with them
must not also start, restart, resume or control the game. Clear or consume held
and discrete inputs at transitions so closing settings cannot trigger an
unintended game action; a fresh press is required for subsequent actions.

Keep the selected profile across screen changes and reloads on the same browser
using local storage. Start with the Asteroids defaults in the table when no
saved preference exists. Treat unavailable storage, malformed data and values
outside the library's valid ranges as non-fatal: use these defaults for an
invalid saved profile, and allow tuning and play for the current session even
if saving fails. Existing valid saved preferences remain in effect. Reset also
replaces the saved preference when storage is available. These app defaults do
not change the shared library defaults. This preference is separate from the
high score.

The app owns the settings interface and preference; configure the renderer
through the library's public profile API. Continue drawing the game through
`DrawingContext`, without exposing renderer-specific configuration as drawing
state or importing renderer internals. No shared settings framework or changes
to gameplay rules are required.

### Review scenarios

- Open settings from title and pause; the sample scene is visible and a run
  does not advance. Confirm all entry methods are unavailable during active
  play, intermission and game over.
- Change each value and see the result immediately; close settings and confirm
  the chosen appearance persists across game screens and reload. Reset restores
  the four defaults immediately and after reload.
- Use pointer, keyboard and gamepad to adjust, reset and close settings. Check
  labels, numeric values and selection, and confirm settings input does not leak
  into gameplay or cause an unintended restart or resume.
- Lose focus while settings are open and return; the run remains paused until
  explicitly resumed. Verify play and session-only tuning still work with
  unavailable storage or an invalid saved profile.
- Check that settings and a useful preview remain accessible at narrow and
  wide viewport sizes, and that global profile changes affect the HUD as well
  as game objects.

## Proposed: retro sound effects

**Status: Provisional proposal; not accepted for implementation.** Audio
remains deferred in the accepted gameplay specification above. The following
captures ideas for discussion rather than settled requirements.

A possible direction is a sparse, punchy arcade sound palette that complements
the vector display without requiring faithful emulation of the original game.
Candidate cues include a short descending shot, noise bursts that vary with
asteroid size, a more substantial ship-destruction sound, a continuous thrust
sound, a distinctive saucer tone, and brief hyperspace and extra-life cues.
Start with effects rather than music; Gyruss music is a separate, deferred topic.

Possible implementation approaches include synthesizing sounds in the browser
with Web Audio, designing short effects with sfxr/jsfxr and playing exported
samples, or combining the two. In particular, a generated thrust sound could
fade in and out while short effects use samples. Similar-sounding synthesis is
not necessarily an exact reproduction of a jsfxr preset; if exact reproduction
matters, evaluate using its generated waveform or synthesis code. No tool,
dependency, asset format or particular sound has been chosen.

Consider a mute control, balanced volume when effects overlap, stopping or
fading continuous sounds on pause and focus loss, and browser restrictions on
starting audio before a user gesture. Playback failure or muted audio should
not prevent play. Whether sound is enabled by default, how preferences persist,
and the exact behavior on resume remain open for review. Audio and event
handling would initially belong to the app, not the drawing renderer; consider
a shared package only if another consumer demonstrates a concrete need.

## Proposed: fixed simulation timestep and interpolation

**Status: Provisional proposal; not accepted for implementation.** The current
app uses one variable-duration simulation update per rendered frame, capped at
50 ms. This section explores an alternative, not a requirement to change it.

Consider advancing gameplay at a fixed rate independently of rendering, using
an accumulator and retaining the two most recent simulation states. Render
moving objects between those states using the fraction of the next tick already
accumulated. A 60 Hz simulation is a possible starting point; compare it with
120 Hz for responsiveness and cost. Rendering could then remain smooth at
refresh rates such as 165 Hz without changing the simulation rate. Conventional
interpolation displays a state roughly one tick behind real time; the effect on
input feel needs evaluation.

A candidate design should address:

- **Input:** retain discrete presses until a simulation tick consumes them,
  consume each once, and handle frames with zero or multiple ticks. Preserve
  continuous controls and the existing pause and focus-loss behavior.
- **Wrapping:** interpolate along the short path across playfield edges and
  corners, including wrapped copies, rather than across the middle of the
  screen. Collision calculations continue to use simulation state.
- **Discontinuities:** hyperspace and respawn should snap rather than interpolate
  across the field; initialize or reset interpolation history for teleports and
  newly spawned objects. Define behavior for destruction and splitting too.
- **Catch-up:** bound work after slow frames or focus loss to avoid an unbounded
  backlog. Decide explicitly when accumulated time is discarded and how that
  affects game timers; avoid silently promising wall-clock timing.
- **Verification:** compare gameplay at different render rates, including 60,
  120, 165 and 240 Hz, and exercise frames with zero or several ticks. Try a
  deliberately low tick rate to make interpolation errors visible; check edge
  and corner wrapping, hyperspace, respawn, input transitions and pause. A
  simulation test cannot replace a visual check on a high-refresh display.

The tick rate, catch-up limit, interpolation details and responsiveness
trade-offs are unresolved. A fixed timestep improves consistency but does not
by itself guarantee deterministic results or prevent all missed collisions.
The simulation and interpolation would remain game-owned unless a concrete
shared game-oriented need emerges; they do not belong in the drawing contract.
