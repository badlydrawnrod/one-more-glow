# Asteroids Flight: gameplay

This is a reverse-engineered baseline of the current Asteroids-style flight
demo, not a claim that every detail is an accepted design decision. Values and
mechanics can be reconsidered as the demo develops. See [README.md](README.md)
for how to run and control it.

## Current demo

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

This is currently a flight demonstration: it has no firing, collision effects,
score, lives or game-over state. Whether and how to add gameplay is an open
decision, not an instruction to implement those features.

## Proposed refresh: complete game

The following is a **proposed** design for review, not accepted or implemented
behavior. The values are starting points for playtesting.

### Goal and flow

Survive as long as possible and score points by destroying asteroids and enemy
saucers. Clear all asteroids to advance to the next, harder wave. Waves continue
indefinitely; the run ends when the last life is lost.

- A title screen names the game, explains the controls and offers start. Start
  resets the score, lives, wave and transient state. Begin wave 1 with three
  lives, including the ship in play, and briefly display each wave number.
- When the last asteroid is destroyed, remove the saucer and all shots, then
  start the next wave after a two-second intermission. The ship retains its
  position, velocity and remaining lives.
- After the final death, show game over, final score and a restart prompt. A
  fresh press is required; holding start through the transition cannot restart.
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

| Parameter | Proposed progression |
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

### Presentation and boundaries

Retain the glowing vector aesthetic, star field, ship thrust flame and segmented
text. Distinguish asteroid sizes, saucer sizes, player and enemy shots, ship
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
