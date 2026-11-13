# Floating score awards

## Scope and status

**Status: Accepted. Implementation: Present.** Robot destruction events feed
transient room-scoped score flyups. Type checking and the production build
pass; automated behavior tests have not been run. The original game's
[Flyup](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/Flyup.java),
[FlyupManager](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/FlyupManager.java)
and [scoring events](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/StatusManager.java)
are references for this feedback. Use the app's existing glowing vector text
rather than adding an HTML overlay or importing the original font assets.

- When a robot is destroyed and points are awarded, briefly show the awarded
  points near the robot's last position. This applies regardless of what
  destroyed it, including the Captain and other robots.
- Show the total awarded for that event. If destroying the final robot also
  earns the room-clear bonus, show the robot points and bonus together in one
  flyup; do not create a second flyup for the same award. If one update
  destroys multiple robots and clears the room, attach the room-clear bonus
  to one of those robots' flyups.
- Rise gently and fade over a short interval, starting near the event and
  remaining legible against the room. Lifetime, offset, rise speed and style
  are tuning choices; keep the effect unobtrusive when multiple awards happen
  close together.
- A flyup is presentation only. It does not modify the score, progression or
  game state. Create it from the actual score award so each award is shown at
  most once, including awards earned during the death interval.
- Keep flyups aligned with the room where they were created and clip them at
  room boundaries, including while the room scrolls during a transition.
  Discard them when that room leaves the screen. Clear them on a fresh run.
  Do not show them on attract screens.
- Respect reduced-motion preferences by showing the score briefly in a
  stationary position without upward movement.

### Verification scenarios

- Confirm each robot destruction shows the points actually awarded at its
  position, including each destruction cause and Captain-related destruction.
- Confirm the final robot's flyup includes both its robot points and the room
  clear bonus exactly once; leaving an uncleared room produces no bonus flyup.
- Confirm flyups do not change scoring, occur during the death interval when
  scoring continues, and remain readable when awards overlap in time.
- Check room alignment, clipping, removal with the old room, clearing on
  restart, absence on attract screens, and stationary reduced-motion
  presentation.
