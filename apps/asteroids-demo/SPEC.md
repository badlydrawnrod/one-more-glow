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
- The HUD shows speed, thrust state and input connection status.

This is currently a flight demonstration: it has no firing, collision effects,
score, lives or game-over state. Whether and how to add gameplay is an open
decision, not an instruction to implement those features.
