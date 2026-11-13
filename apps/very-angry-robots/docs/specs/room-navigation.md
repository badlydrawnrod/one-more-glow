# Room navigation

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
- Player defeat consumes a life as described below. The Captain is implemented
  as specified below; sound remains outside the implemented slice.

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
