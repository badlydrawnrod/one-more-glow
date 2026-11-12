# Very Angry Robots

## Scope and status

**Status: Accepted. Implementation: Present; browser and gamepad playtesting
and visual tuning remain outstanding.**

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
- Defeat of the player ends the run. Clearly show the outcome and offer a
  fresh restart that resets the room, player, robots and shots. Gameplay stops
  after defeat until restart.

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
  still ends the run if the final robot is destroyed in the same update.
- Losing shows the outcome and stops play. Restart returns to a playable
  initial state without leftover shots or damage. Clearing the current room
  leaves the game playable.
- Check the room and controls at narrow and wide viewport sizes and playtest
  both keyboard and gamepad for readable, fair combat.

## Room navigation

**Status: Accepted. Implementation: Present; browser and gamepad playtesting
and visual tuning remain outstanding.**

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
- Player defeat still ends this slice and offers a fresh restart. Sound,
  scoring, lives, difficulty progression and the Captain remain deferred.

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

## Deferred and open decisions

Sound, the original family-member taunts and other recordings, the Captain,
score and lives, difficulty progression, achievements and persistence are
outside this slice. Their eventual treatment
remains open. The original's artwork and recordings belong to the author;
decisions about reusing them can wait until those features are considered.
