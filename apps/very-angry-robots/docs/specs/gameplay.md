# Core gameplay

## Scope and status

**Status: Accepted. Implementation: Present; responsive canvas sizing has been
reviewed at several viewport sizes.** The in-game robot character design,
walking gait, scale, movement-directed eye gaze and wall clearance are based on
the title vignette. The user has reviewed and accepted the gameplay robot
design. The user considers the single-room work complete and has playtested
room navigation. Gamepad and reduced-motion behavior have not yet been
playtested; broader combat and control playtesting remain unconfirmed.

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
  The room and controls should remain legible at different viewport sizes. Fit
  the 4:3 game canvas within both the available page width and the height left
  after the page header and controls, while preserving its fixed logical
  coordinate system. If the surrounding content cannot fit vertically, allow
  the page to scroll rather than clipping it.
- Give hostile robots the angular outlined humanoid design shown in the title
  vignette, scaled for gameplay. Their eyes follow their direction of travel,
  and their limbs use an alternating walking gait while they move. Wall
  clearance must contain the complete animated outline so no part appears to
  pass through a wall. Keep the combat hit radius centered on the robot's core
  body rather than expanding it to the full decorative silhouette.
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
