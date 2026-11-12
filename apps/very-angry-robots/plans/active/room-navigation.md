# Very Angry Robots: room navigation

**Status:** In progress

## Objective

Extend the playable demo to navigate between adjacent rooms, preserving the
current room presentation and following the accepted original-game rules.

## Durable references

- [App specification](../../SPEC.md), especially Room navigation
- [Engineering principles](../../../../docs/engineering.md)
- [Repository architecture](../../../../docs/architecture.md)
- [Original game source](https://github.com/libgdx/libgdx-demo-very-angry-robots)
- [Single-room plan](single-room.md), including outstanding playtesting

## Scope

Implement navigation, seeded room generation and revisits, shared doorway
geometry and collisions, transitions, and their verification. Update the app's
documentation and implementation status. Scoring, lives, sound, difficulty
progression, the Captain and mobile controls remain outside the scope.

## Decisions

- Keep room state, collision rules and transition presentation in the app;
  use the public drawing API and avoid changes to the library for game rules.
- Treat the existing single-room win and non-traversable doorway preview as
  superseded behavior; preserve player defeat and restart.

## Work

- [x] Review the original entry, exit, collision, regeneration and scrolling
  behavior against the current simulation, drawing code and accepted spec.
  Identify the minimal shared geometry and state needed for all four sides.
- [x] Represent doorway openings, closed entrance and jambs with geometry
  shared by rendering and collision. Replace the unconditional hazardous room
  boundary while retaining wall and closed-door hazards, including for shots
  and robots. Keep the current room proportions and visual treatment.
- [x] Add run seed, room coordinates, entry side and reproducible room
  generation. Enter from each opposite doorway with safe player and robot
  placement; repopulate rooms and clear shots on entry. Restart a fresh run.
- [x] Detect exits only through openings, including with robots remaining or
  after clearing them. Remove the room-clear terminal outcome. Ensure collisions
  and exits resolve consistently and robots and shots cannot enter other rooms.
- [x] Add directional old/new room presentation with a stationary HUD and a
  paused simulation; handle reduced motion and ensure the moving scene does
  not obscure the HUD or leak outside the intended view. Check available public
  drawing capabilities before choosing how to constrain the scene.
- [x] Update automated behavior tests for navigation, four exit directions,
  door and jamb collisions, safe spawning, deterministic revisits, fresh
  population, restart, transition timing and input suppression. Update tests
  that previously expected a room-clear win.
- [x] Update the spec's implementation status and remove preview-only guidance;
  update app and repository documentation where the single-room description
  is no longer accurate. Reconcile the earlier plan's outstanding checks.
- [ ] Run automated checks and playtest transitions, combat and controls,
  including narrow and wide viewports, reduced motion and gamepad.

## Verification

- Tests: All 37 app tests passed, including navigation and transition tests.
- Type checking: Passed as part of the workspace build.
- Build: Workspace production build passed.
- Browser and gamepad playtesting: Not run; no browser or gamepad is available
  in the execution environment. Visual review and hands-on playtesting remain.
- User reported navigation working well. Subsequent door fitting, player
  placement and sliding-door animation still need visual playtesting.

## Open questions

- Visual and gameplay tuning, including reduced-motion and gamepad checks,
  requires a browser and a standard-mapped controller.

## Next action

Run `npm run dev:robots` and playtest the navigation verification scenarios
in a browser, including reduced motion and a standard-mapped gamepad.

## Completion criteria

- [ ] The accepted navigation scenarios work and implementation status is current.
- [ ] Relevant automated checks and manual playtests are recorded, including
  any environment limitations.
- [ ] Documentation and the earlier plan reflect the completed behavior, with
  no unresolved work in the agreed scope.
