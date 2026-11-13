# Particle effects

## Scope and status

**Status: Accepted. Implementation: Present.** Room-scoped simulation events
now drive transient vector bursts. Type checking and the production build
pass; automated behavior tests have not been run. The original game's
[ParticleAdapter](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/ParticleAdapter.java)
and [WorldView](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/WorldView.java)
are references for the events and brief bursts; this app should express them
with its existing glowing vector style, not reproduce the original's raster
particles.

Add transient visual feedback for important combat impacts:

- When a robot is destroyed by any cause, emit a brief burst from its last
  position in that room's robot colour.
- When the player is defeated, emit a larger, bright burst at the player's
  position. This is presentation for the existing death event and does not
  alter lives, controls or the death interval.
- When a shot hits a wall, robot, player or the Captain, emit a smaller impact
  burst at the collision point. A shot that merely leaves the play area does
  not create an impact effect. Sparks from a player-shot impact fan back
  opposite the shot's travel direction. Impacts on the Captain also inherit its
  velocity because it continues moving after the hit. Robot-hit effects stay at
  the impact point because the robot is destroyed; its destruction burst remains
  radial regardless of what caused it.
- Bursts use small glowing vector marks that spread briefly from the event,
  then fade. Their size, density, speed and lifetime are tuning choices; keep
  them short and restrained so they do not obscure the room or entities.
- Effects are presentation only. They do not change collision, scoring,
  movement, room transitions or game outcomes. Resolve each event once so
  simultaneous contacts cannot duplicate the same destruction effect.
- Effects belong to the room where they were created. Keep them aligned with
  that room during its presentation, including while it scrolls during a room
  transition; clip them at room boundaries and discard them when that room
  leaves the screen. Clear them on a fresh run. They must not appear on
  attract screens.
- Respect reduced-motion preferences: show a brief stationary impact flash
  instead of outward-moving particles.

### Verification scenarios

- Confirm robot bursts use the current robot colour and appear once for every
  destruction cause, including the Captain and other robots.
- Confirm player defeat and colliding shots produce their effects, while shots
  leaving the play area produce none.
- Confirm bursts do not affect gameplay and do not duplicate during
  simultaneous contacts.
- Check that effects stay with the correct room during transitions, remain
  clipped to room boundaries, leave with the old room, clear on restart, and
  are absent from attract screens.
- Check reduced-motion presentation and tune visibility so effects are clear
  without obscuring combat.
