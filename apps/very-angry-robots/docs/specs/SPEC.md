# Very Angry Robots specification

## Scope and status

**Status: Accepted.** This app is a playable vector interpretation of Rod Hyde’s
[Very Angry Robots](https://github.com/libgdx/libgdx-demo-very-angry-robots).
The original game is the reference for its character and mechanics; this is
not a line-by-line port. The current slice establishes the combat and vector
presentation, then expands it with room navigation and progression.

The requirements and their implementation and verification status are
organized by capability:

- [Core gameplay](gameplay.md) — room, combat, controls and presentation.
- [Room navigation](room-navigation.md) — adjacent rooms, exits and transitions.
- [Score and robot difficulty progression](progression.md) — scoring and tiers.
- [Particle effects](particle-effects.md) — transient hit and destruction effects.
- [Floating score awards](score-flyups.md) — brief score labels at scoring events.
- [Lives and respawning](lives.md) — lives, death and respawn rules.
- [High scores and attract screens](high-scores.md) — accepted and implemented.
- [Pause and display settings](pause-and-display-settings.md) — pause controls and
  player-adjustable vector display settings.
- [Touch controls](touch-controls.md) — accepted touch gameplay and screen-flow
  controls; implementation pending.
- [The Captain](captain.md) — the persistent pursuer and its presentation.
- [Audio](audio.md) — sound effects, Captain speech and robot taunts.

Audio effects, Captain speech and robot taunts are accepted and implemented.
Achievements remain deferred. Active game state is not
persisted between sessions: after a reload, the player starts a fresh run.
High scores are persisted as specified in the accepted high-score capability.
The original artwork and recordings belong to the author; retain their
attribution and license notices if reused. See the relevant capability spec
for additional deferrals and verification gaps.
