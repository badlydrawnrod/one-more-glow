# Implement floating score awards

**Status:** Proposed — awaiting user review before implementation

## Objective

Show short-lived score labels near robot destruction events, including the
room-clear bonus, while keeping scoring rules in the simulation and flyup
animation in app presentation code.

## Durable references

- `apps/very-angry-robots/docs/specs/score-flyups.md`
- `apps/very-angry-robots/docs/specs/progression.md`
- `apps/very-angry-robots/docs/specs/room-navigation.md`
- `apps/very-angry-robots/docs/specs/lives.md`
- `docs/engineering.md`

## Scope

**In scope:**
- Return semantic simulation events so presentation can respond to robot
  destruction without reconstructing it from score deltas.
- Include each destroyed robot's last position, room identity, robot color and
  exact points awarded so flyups and a later particle effect can share the
  destruction event.
- Animate and draw flyups with the existing segment text and drawing API.
- Keep flyups positioned with their room while it scrolls, then discard them
  when that room leaves the screen; clear them on fresh restart.
- Honor reduced motion with stationary flyups.
- Keep flyups presentation-only and show score earned during the death
  interval.

**Out of scope:**
- Particle bursts, sound, new fonts or HTML overlays.
- Changes to score values, lives, progression or room population.
- Saving flyups or active game state between sessions.

## Decisions

- Proposed: have `updateGame` return a list of semantic events produced during
  that update. This plan adds a `robot-destroyed` event carrying position,
  room identity, robot color and points awarded. Presentation consumers can
  independently create the score flyup now and a destruction burst later.
  Do not infer events from score deltas, which lose attribution when several
  robots are destroyed in one update.
- Keep the event boundary extensible for the accepted particle-effects
  capability: a later change can add explicit player-defeat and shot-impact
  events. Those effects and events are outside this flyup implementation.
- Represent the room-clear bonus as part of one robot's flyup. If multiple
  robots are destroyed in the update that clears the room, attach the bonus to
  the first destroyed robot in the simulation's stable robot order; show the
  ordinary robot award at each other destroyed robot. The user approved this
  behavior on 2026-11-13.
- Proposed: keep transient flyup animation state in a small presentation
  module, separate from persistent game state and scoring rules.

## Work

- [ ] Review and approve the revised plan before implementation.
- [ ] Add an explicit simulation-event boundary with a robot-destroyed event
  that preserves position, room identity, robot color and award amount without
  changing score or difficulty behavior.
- [ ] Add transient flyup state with a short upward drift and fade, plus a
  stationary reduced-motion presentation.
- [ ] Draw flyups in the room scene with room clipping and transition offsets;
  remove them when their room leaves the screen and clear them on restart.
- [ ] Review behavior against the accepted flyup scenarios and record results.

## Verification

- Tests: Not run
- Type checking: Not run
- Build: Not run
- Implementation has not started pending review.

## Open questions

- None currently. The simulation-to-presentation event boundary is an
  implementation detail to settle while following the accepted specifications.

## Next action

Wait for user review of the revised plan. Do not implement until the user
approves or revises it.

## Completion criteria

- [ ] The accepted flyup behavior is implemented without changing score,
  progression or game outcomes.
- [ ] Flyups remain correctly positioned and clipped during room presentation,
  respect reduced motion, and do not carry into a different room.
- [ ] Relevant checks are run and their results are recorded.
- [ ] The plan is completed and removed according to `plans/README.md`.
