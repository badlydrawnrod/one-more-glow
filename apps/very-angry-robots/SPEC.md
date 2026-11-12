# Very Angry Robots: single-room demo

## Scope and status

**Status: Accepted. Implementation: Present; browser and gamepad playtesting
and visual tuning remain outstanding.**

Create a playable, single-room vector interpretation of Rod Hyde's
[Very Angry Robots](https://github.com/libgdx/libgdx-demo-very-angry-robots).
The original game is the reference for its character and mechanics; this slice
does not require a line-by-line port. Its purpose is to establish whether the
combat and vector presentation feel right before expanding the game.

## Play

- The player and several hostile robots occupy one enclosed room with internal
  walls. Generate the maze using the original game's recursive-division
  approach, adapted to this room's dimensions; doors and traversal remain
  deferred. The initial arrangement gives the player room to react and at
  least one navigable route through the room.
- Use a 1000 × 600 room with a 5 × 3 grid of 200 × 200 cells, leaving space
  above the room for the HUD. Show start and outcome messages over the room
  while play is stopped.
- **Experimental visual preview:** Show a closed entrance behind the player
  and open doorways in the other three walls. Door traversal is not implemented;
  the room boundary remains hazardous even where a doorway is shown, and the
  decorative jambs do not have their own collision geometry.
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
- Defeating every robot wins the room; defeat of the player loses it. Clearly
  show the outcome and offer a fresh restart that resets the room, player,
  robots and shots. Once an outcome is reached, gameplay stops until restart.

The exact layout, robot count, speeds, firing rates, collision dimensions and
visual effects are playtest choices. Start from the original's behavior where
practical; adjust them to make this slice readable and enjoyable. If both win
and loss occur in the same update, loss takes precedence.

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
  Simultaneous contacts do not produce duplicate effects, and loss takes
  precedence over a simultaneous room clear.
- Clearing the room or losing shows the corresponding outcome and stops play.
  Restart returns to a playable initial state without leftover shots or damage.
- Check the room and controls at narrow and wide viewport sizes and playtest
  both keyboard and gamepad for readable, fair combat.

## Deferred and open decisions

Sound, the original family-member taunts and other recordings, multiple rooms,
door traversal, the Captain, score and lives, difficulty progression,
achievements and persistence are outside this slice. Their eventual treatment
remains open. The original's artwork and recordings belong to the author;
decisions about reusing them can wait until those features are considered.
