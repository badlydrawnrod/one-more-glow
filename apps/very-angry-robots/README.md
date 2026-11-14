# Very Angry Robots

A vector interpretation of Rod Hyde's
[Very Angry Robots](https://github.com/libgdx/libgdx-demo-very-angry-robots).
From the repository root, run `npm run dev:robots`.

Move with WASD and fire with the arrow keys; on a standard gamepad, use the
left stick to move and the right stick to fire. Press Enter or gamepad Start
to start or restart. Electrified walls, robots and robot shots are dangerous.
Move through an open doorway to enter an adjacent room; the door behind you
closes. You can leave before all the robots are destroyed. Closed doors are
electrified, like the walls. Destroy robots for points and clear a room for a
bonus. Higher scores bring different robot colours, larger groups and more
robot fire in subsequent rooms. You start with three lives and return to the
same room after losing one. Earn extra lives at 10,000 and 50,000 points.
The Captain eventually enters each room: he cannot be stopped by shots or
walls, so keep moving.

The game opens on the Main Menu. Press Enter or Gamepad Start to begin. On the
attract screens, use WASD, the arrow keys, or either gamepad stick to switch
between the Main Menu and Top Scores. Qualifying scores can be saved with up to
three initials and are kept in browser storage.

During a run, press P or Gamepad Start to pause or resume. Browser focus loss
pauses the run until you explicitly resume. Open Display Settings from the
Main Menu, Top Scores or pause screen with S or Gamepad Back/Select; adjust the
vector line and glow profile, which is saved in browser storage.

The [specification](docs/specs/SPEC.md) describes this slice and deferred features. Run
`npm run test --workspace=very-angry-robots` for the app's tests.
