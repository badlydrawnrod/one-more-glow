# Lives and respawning

**Status: Accepted. Implementation: Present.** Automated tests cover the
lives and respawning rules, and the user reports that playtesting is good.
Gamepad and reduced-motion checks remain unverified. The original's
[world](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/World.java),
[status manager](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/StatusManager.java)
and [configuration](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/data/veryangryrobots.properties)
are the reference.

- Start a run with three lives, including the life currently being played.
  Show the number of lives in the HUD alongside the score and robot count;
  keep all three readable and the room's existing size and placement.
- A lethal collision costs exactly one life, even if several hazards collide
  with the player in the same update. The player cannot move or shoot during
  a two-second death interval. Show a clear death indication. The remaining
  robots and shots continue updating and interacting during this interval, as
  in the original; the Captain also continues updating.
  The defeated player cannot be hit again.
  Robot destruction during this interval scores normally.
- After the interval, if lives remain, respawn at the current room's original
  entrance position. Keep the same room, maze, closed entrance, room difficulty,
  score and destroyed-robot count. Return each surviving robot to its original
  spawn position; do not restore destroyed robots. Clear all shots and reset
  the Captain. Resume play without a room transition.
  Preserve the original's two-second robot firing amnesty after respawning:
  robots may move and collide but may not fire during that time. Start the
  same amnesty when normal play begins after entering a room.
- At zero lives, show game over after the death interval and stop play; offer
  the existing fresh restart. Restart resets lives, score, room, progression,
  shots and the Captain. Award one extra life the first time
  the score reaches or crosses 10,000 and another at 50,000, as in the original; neither repeats in
  the same run. If one score change crosses both thresholds, award both.
  Scoring during the death interval can earn an extra life and permit a
  respawn even when the most recent death reduced the count to zero. This
  specifies the observable result explicitly: the original deducts the life
  at the end of the death interval rather than at the moment of death.
- A room-clear bonus is still awarded at most once per populated room, even
  if its last robot is destroyed during the death interval. A death does not
  repopulate the room or re-evaluate difficulty. Exiting and revisiting still
  populate a fresh room under the existing navigation rules.

### Lives verification

- Confirm the HUD starts at three; each lethal cause and simultaneous hazards
  deduct one life. Check the delay, disabled controls and continued scoring.
- Check survivors return to their spawn positions, destroyed robots remain
  absent, shots clear, and firing amnesty applies after
  respawn and room entry. Confirm maze, score, tier and clear-bonus state persist.
- Test extra lives at and across both thresholds, no duplicate awards, a life
  earned during the death interval, final game over and fresh restart.
