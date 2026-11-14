# The Captain

**Status: Accepted. Implementation: Present.** Automated tests cover the
Captain's gameplay and clipping. The user reports that the Captain's balance
is pretty good and has accepted his appearance. Gamepad and reduced-motion
behavior have not been playtested. The original's
[Captain](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/mobiles/Captain.java),
[world](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/World.java)
and [configuration](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/data/veryangryrobots.properties)
are the reference. The Captain is a persistent pursuer that encourages the
player to leave a room, including one that has been cleared.

- On room entry, place the Captain out of sight beyond the closed entrance.
  Lurk for `max(2, 1.5 × initial robot count)` seconds of active room play:
  six robots give 9 seconds, nine give 13.5, and twelve give 18. Calculate
  the delay once when the Captain is placed; later robot deaths do not shorten
  it. The timer does not advance during a room transition or while paused.
- After the delay the Captain becomes visible, enters from the closed-entrance
  side and relentlessly pursues the player. Move directly toward the player
  with the original's characteristic vertical bouncing motion; the Captain
  passes through walls and doors. The original's pursuit speed is 3.75 versus
  the player's 12.5 world units per second, a 0.3 ratio. The current pursuit
  speed is 0.5 times the player's speed for playtesting; tune motion and size
  through playtesting.
- The Captain cannot be destroyed or stopped by walls, doors, player shots or
  robot shots. Contact kills the player, destroys robots and consumes shots
  from either side. Robots destroyed by the Captain award normal points and
  can trigger the room-clear bonus. The Captain neither fires nor awards
  points when hit.
- Show a larger robot-head silhouette matching the robots’ blocky vector style,
  with a steel-blue outline and red eyes. Keep it readily distinguishable from
  the player, regular robots, walls and projectiles. Animate its bounce in
  keeping with the current visual style; with reduced motion, preserve the gameplay
  trajectory while avoiding unnecessary presentation animation. Clip the
  Captain's drawing to the current room boundary, including while entering
  from outside and while rooms scroll; no part of its vector geometry should
  appear outside its room. This is a drawing constraint and does not change
  movement or collisions. The Captain's entrance speech is specified in
  [Audio](audio.md).
- The Captain does not follow the player between rooms. On each room entry,
  reset it outside the new entrance and start a new lurk timer. After a death,
  also reset it outside the current entrance and calculate a fresh delay from
  the number of surviving robots at respawn, including a two-second minimum
  for an empty room. The lurk timer and Captain continue during the death
  interval until that reset, matching the original's mobile updates.

### Captain verification

- Check lurk timing for six, nine, twelve and zero robots, including robot
  deaths after placement, a cleared room, transitions, and respawn.
- Verify entry from all four sides, pursuit through walls and doors, and that
  shots cannot stop the Captain. Check its collisions with the player, robots
  and both shot types, including scoring and simultaneous collisions.
- Confirm it resets on room entry and respawn. Check clipping at all four
  room edges, including partially visible entry and scrolling transitions,
  as well as visibility, movement, reduced-motion presentation and fairness
  through playtesting.
