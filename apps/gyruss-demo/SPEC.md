# Orbital Assault: gameplay

This is a reverse-engineered baseline of the current Gyruss-style demo, not a
claim that every detail is an accepted design decision. Values and mechanics
can be reconsidered as the game develops. See [README.md](README.md) for how to
run and control it.

## Current game

- The player moves around the rim of a circular tunnel and fires inward.
- Enemy ships emerge near the centre, spiral outward in waves, and disappear
  after passing the rim. A new wave begins on a timer; it does not wait for
  every enemy from the previous wave to be destroyed.
- A bullet destroys one enemy and awards 100 points. A collision with an enemy
  removes that enemy and costs the player one ship.
- A game starts with three ships and no points. The in-screen HUD uses the
  library's 22-segment vector text for score, wave, remaining ships, input
  connection status and sector label. After the last ship is lost, the game
  ends; restarting resets the game.
- The scene uses glowing vector geometry, with a star field, tunnel, ships and
  projectiles. Enemies and projectiles appear smaller toward the tunnel centre.

## Experimental explosions

Ship explosions are an experiment, not an accepted library feature or a settled
gameplay requirement. Destroyed enemies emit a burst of glowing particles; a
player collision produces a larger player burst as well. The current experiment
briefly hides and protects the player ship and prevents firing after a non-final
hit; movement and the rest of the game continue. After the final hit, gameplay
stops and the game-over overlay waits briefly while the explosion plays. The
particle simulation lives in this app and draws through the existing library API.

The effect's appearance, gameplay timing, and whether particles should become
a reusable facility remain open decisions.
