# Very Angry Robots

## Scope and status

**Status: Accepted. Implementation: Present.** The user considers the
single-room work complete and has playtested room navigation. Gamepad and
reduced-motion behavior have not yet been playtested; checks at varied viewport
sizes and broader combat and control playtesting remain unconfirmed.

Create a playable vector interpretation of Rod Hyde's
[Very Angry Robots](https://github.com/libgdx/libgdx-demo-very-angry-robots).
The original game is the reference for its character and mechanics; this slice
does not require a line-by-line port. Its purpose is to establish whether the
combat and vector presentation feel right before expanding the game.

## Play

- The player and several hostile robots occupy a room with internal
  walls. Generate the maze using the original game's recursive-division
  approach, adapted to this room's dimensions. The initial arrangement gives
  the player room to react and at least one navigable route through the room.
- Use a 1000 × 600 room with a 5 × 3 grid of 200 × 200 cells, leaving space
  above the room for the HUD. Show start and outcome messages over the room
  while play is stopped.
- The player can move in eight directions and shoot in eight directions.
  Movement and aiming are independently controllable, including while moving.
  Holding a firing direction fires repeatedly at a limited rate; releasing it
  stops firing. Shots travel in straight lines and disappear on impact or when
  they leave the play area.
- Robots pursue the player, attempt to move around obstructing walls, and fire
  at the player when they have line of sight. Their movement and firing should
  leave the player a reasonable opportunity to react. They do not shoot through
  walls.
- Player shots destroy robots. Robot shots and contact with a robot defeat the
  player. Shots hitting a wall disappear. Contact with an electrified wall
  defeats the player or a robot, in keeping with the original game. Robots can
  also be destroyed by robot shots or contact with one another. A shot can
  affect at most one target, and a defeated entity cannot be defeated again.
- A player defeat costs a life. Respawn in the current room while lives remain;
  when no lives remain after the death interval, show game over and offer a
  fresh restart. The lives and respawning rules are specified below.

The exact layout, robot count, speeds, firing rates, collision dimensions and
visual effects are playtest choices. Start from the original's behavior where
practical; adjust them to make this slice readable and enjoyable.

## Controls and presentation

- Support keyboard and standard-mapped gamepad. Use WASD to move and arrow
  keys to fire; on gamepad use the left stick to move and right stick to fire.
  Provide a clear start/restart action and display the controls. Apply a
  dead zone to gamepad sticks. Clear held keyboard inputs on focus loss so the
  player does not continue moving or firing unexpectedly.
- Draw the room, player, robots and shots as clearly distinguishable glowing
  vector shapes. Make walls visibly hazardous and show the direction of fire.
  The designs should evoke the original without requiring its raster sprites.
  The room and controls should remain legible at different viewport sizes.
- Use the library's public drawing API for the scene and text. Gameplay,
  input and presentation belong to the app; the library should not acquire
  game-specific rules or a new renderer interface for this demo.

## Verification scenarios

- Move and fire independently using either supported input method; holding and
  releasing fire behaves as described, including after losing focus.
- Walls block shots and line of sight. Contact with a wall defeats the player
  or a robot; robots can navigate around obstacles where a route is available.
- Player shots destroy robots; robot shots and robot contact defeat the player.
  Robot friendly fire and robot-to-robot collisions destroy their targets.
  Simultaneous contacts do not produce duplicate effects; a player defeat
  still costs a life if the final robot is destroyed in the same update.
- Losing the last life shows the outcome and stops play. Restart returns to a
  playable initial state without leftover shots or damage. Clearing the
  current room leaves the game playable.
- Check the room and controls at narrow and wide viewport sizes and playtest
  both keyboard and gamepad for readable, fair combat.

## Room navigation

**Status: Accepted. Implementation: Present.** The user reports that room
navigation works through playtesting. Automated tests cover the navigation
rules; gamepad and reduced-motion behavior have not yet been playtested, and
verification at varied viewport sizes remains unconfirmed.

Extend the demo to a continuous sequence of adjacent rooms. The original
game's [world](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/World.java),
[maze generator](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/MazeGenerator.java)
and [room presentation](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/WorldView.java)
are the reference for these rules.

- Retain the current room size, square-cell maze, visual style and HUD space.
  Each of the four walls has a centered doorway. The entrance is closed and
  the other three doorways are open. The initial room's entrance is on the
  left, behind the player, as in the current demo.
- The player can leave through any open doorway at any time, including while
  robots remain. Clearing a room does not end the game or close its exits.
  Crossing an exit takes the player to the adjacent room in that direction;
  the corresponding opposite doorway is the closed entrance to the new room.
  Place the player safely just inside that entrance, with room to react.
- Walls, closed doors and their visible jambs have matching collision
  geometry. They are hazardous as in the original; the player can cross an
  open doorway without touching an invisible hazardous boundary. Shots and
  robots do not travel into adjacent rooms.
- Generate a room's maze from a run-specific seed and its grid coordinates.
  Revisiting a room in the same run reproduces its maze, while the entrance
  door reflects the direction of entry. As in the original, populate the room
  afresh on entry rather than preserving its surviving robots or shots.
  Generate a new run seed on restart. Spawn robots clear of the player, walls,
  closed door and one another, with a reasonable opportunity to react.
- Show the old room scrolling out and the new room scrolling in along the
  direction of travel, as in the original. Once the new room is in place,
  animate its entrance closing in two sliding halves. Pause gameplay during
  the scroll and door animation, then resume. Keep the HUD stationary. With
  reduced motion enabled, show the new room and closed door immediately.
- Player defeat consumes a life as described below. Sound and the Captain
  remain outside the implemented slice.

### Navigation verification

- Leave through each open side, with robots alive and after clearing them;
  arrive at the opposite entrance and confirm the other three exits are open.
- Touch walls, the closed door and jambs; traverse an open doorway without
  taking damage. Confirm neither robots nor shots enter another room.
- Follow a loop back to a previously visited coordinate: its maze matches,
  its entrance matches the return direction, and its robots and shots are
  freshly populated. Restart starts a new run.
- Check that the scrolling direction matches the exit, the HUD stays in place,
  and input and combat do not advance during transitions. Check reduced motion.

## Score and robot difficulty progression

**Status: Accepted. Implementation: Present.** Automated tests cover the
progression rules. The colours, shot speeds and combat balance have not yet
been playtested. This extension follows
the original's
[difficulty manager](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/ScoreBasedDifficultyManager.java),
[scoring rules](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/StatusManager.java)
and [configuration](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/data/veryangryrobots.properties).

### Scoring

- Start each run at zero and show the current score in the HUD. Restarting
  begins a new run and resets the score.
- Award 50 points for every robot destroyed, whether by a player shot, a wall,
  a robot shot or a collision. Award a further 100 points when the last robot
  in the room is destroyed. Award each robot and room-clear bonus at most once.
- The score carries between rooms. Leaving with robots alive is allowed and
  earns no room-clear bonus. Repopulating a room on entry creates a new set of
  robots that can be scored again.

### Difficulty tiers

Select the tier using the score when a room is populated. The colour, robot
count, shot limit and shot speed are fixed for that room; score changes during
combat affect the next room. All robots in a room use the tier's colour and
share the same pursuit behavior.

| Score from | Robot colour | Maximum robot shots in flight | Shot speed |
| ---: | --- | ---: | --- |
| 0 | Dark yellow | 0 | Slow |
| 300 | Red | 1 | Slow |
| 1,000 | Dark cyan | 2 | Slow |
| 2,000 | Green | 3 | Slow |
| 4,000 | Dark purple | 4 | Slow |
| 5,000 | Light yellow | 5 | Slow |
| 6,000 | White | 1 | Fast |
| 8,000 | Dark cyan | 2 | Fast |
| 10,000 | Light purple | 3 | Fast |
| 12,500 | Grey | 4 | Fast |
| 15,000 | Dark yellow | 5 | Fast |
| 20,000 | Red | 6 | Fast |

- Each threshold includes its stated score and applies until the next
  threshold; the final tier has no upper score limit. Robot colours should be
  visibly distinguishable against the room while retaining the vector glow.
- The shot limit is shared by all robots in the room, not a limit per robot.
  At zero, robots can still pursue and collide but cannot fire. Shots remain
  subject to the existing line-of-sight and collision rules.
- Use two distinct shot speeds. The original's configured slow and fast speeds
  are 4.6875 and 6.0 world units per second respectively; adapt their absolute
  values to this game's dimensions and tune through playtesting, preserving
  the fast-to-slow ratio of approximately 1.28 as a starting point. The
  current speeds are 235 and 300.8 room pixels per second, pending playtesting.
- Start with six robots. On entering a room in a different tier, reset the
  population to six. If the score changed since the previous room was
  populated but remains in the same noninitial tier, increase the population
  by three, up to twelve. If the score did not change, retain the previous
  population. In the initial tier, retain six. Apply this to the score at entry,
  including when several thresholds were crossed in the preceding room.
- Room coordinates determine maze layout; current score determines difficulty
  on every entry, including revisits. A revisit does not restore an earlier
  room's robot population or difficulty.

### Progression verification

- Verify every threshold immediately below and at its score, including the
  switch from slow yellow robots to fast white robots at 6,000 points.
- Verify the shared shot cap, including no shots in the initial tier, and
  confirm a robot may fire again when an existing shot disappears.
- Verify score awards for all destruction causes, the final-robot bonus,
  simultaneous destruction, leaving an uncleared room and revisiting a room.
- Verify six, nine and twelve robot populations within a tier, the reset on
  a tier change, no increase without a score change, the initial-tier rule,
  skipped thresholds and a fresh run's reset to zero and six robots.
- Verify that a score threshold crossed in a room does not alter its current
  robots or shots, but applies when the next room is entered.

## Lives and respawning

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
  in the original; if the Captain is later accepted and implemented, it also
  continues updating. The defeated player cannot be hit again.
  Robot destruction during this interval scores normally.
- After the interval, if lives remain, respawn at the current room's original
  entrance position. Keep the same room, maze, closed entrance, room difficulty,
  score and destroyed-robot count. Return each surviving robot to its original
  spawn position; do not restore destroyed robots. Clear all shots and reset
  the Captain if that separate proposal is accepted and implemented. Resume
  play without a room transition.
  Preserve the original's two-second robot firing amnesty after respawning:
  robots may move and collide but may not fire during that time. Start the
  same amnesty when normal play begins after entering a room.
- At zero lives, show game over after the death interval and stop play; offer
  the existing fresh restart. Restart resets lives, score, room, progression,
  shots and, if implemented, the Captain. Award one extra life the first time
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

## The Captain

**Status: Proposed. Implementation: Not implemented.** The original's
[Captain](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/mobiles/Captain.java),
[world](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/src/com/badlydrawngames/veryangryrobots/World.java)
and [configuration](https://github.com/libgdx/libgdx-demo-very-angry-robots/blob/master/core/data/veryangryrobots.properties)
are the reference. The Captain is a persistent pursuer that encourages the
player to leave a room, including one that has been cleared.

- On room entry, place the Captain out of sight beyond the closed entrance.
  Lurk for `max(2, 2 × initial robot count)` seconds of active room play:
  six robots give 12 seconds, nine give 18, and twelve give 24. Calculate
  the delay once when the Captain is placed; later robot deaths do not shorten
  it. The timer does not advance during a room transition or while paused.
- After the delay the Captain becomes visible, enters from the closed-entrance
  side and relentlessly pursues the player. Move directly toward the player
  with the original's characteristic vertical bouncing motion; the Captain
  passes through walls and doors. The original's pursuit speed is 3.75 versus
  the player's 12.5 world units per second. Use that 0.3 ratio as a starting
  point for adapting speed, and tune motion and size through playtesting.
- The Captain cannot be destroyed or stopped by walls, doors, player shots or
  robot shots. Contact kills the player, destroys robots and consumes shots
  from either side. Robots destroyed by the Captain award normal points and
  can trigger the room-clear bonus. The Captain neither fires nor awards
  points when hit.
- Show a distinctive glowing vector character, readily distinguishable from
  the player, robots, walls and projectiles. Animate its bounce in keeping
  with the current visual style; with reduced motion, preserve the gameplay
  trajectory while avoiding unnecessary presentation animation. Sound and
  taunts remain deferred.
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
- Confirm it resets on room entry and respawn, and check visibility, movement,
  reduced-motion presentation and fairness through playtesting.

## Deferred and open decisions

Sound, the original family-member taunts and other recordings, achievements
and persistence remain deferred. Lives are accepted above; the Captain
remains proposed. The original's
artwork and recordings belong to the author;
decisions about reusing them can wait until those features are considered.
