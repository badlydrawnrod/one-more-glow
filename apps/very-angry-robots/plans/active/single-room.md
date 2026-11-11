# Very Angry Robots: single-room demo

**Status:** In progress

## Objective

Build and playtest the accepted single-room vector adaptation, establishing
whether its combat and presentation capture the original game's character.

## Durable references

- [App specification](../../SPEC.md)
- [Repository architecture](../../../../docs/architecture.md)
- [Engineering principles](../../../../docs/engineering.md)
- [Original game source](https://github.com/libgdx/libgdx-demo-very-angry-robots)

## Scope

Implement the playable room, combat, controls, outcomes and presentation in
the app specification. Integrate the app with workspace commands and document
how to run it. Sound, taunts, multiple rooms, the Captain, score, lives and
other deferred features remain outside this plan.

## Decisions

- Keep gameplay and input app-owned and draw through the library's public API.
  Use the original as a behavioral reference rather than translating its
  libGDX class structure mechanically.
- Layout, tuning and vector designs are playtest choices within the accepted
  spec; record any lasting decisions in the spec.
- The original uses direct pursuit with a line-of-sight check, hazardous
  walls and robot friendly fire; use those as the initial combat reference.

## Work

- [x] Inspect the original room, controls and collision behavior alongside the
  accepted spec; choose an initial layout and tuning for the playable slice.
- [x] Set up the app workspace and implement an independently testable room
  simulation: movement, firing, robot behavior, collisions and outcomes.
- [x] Add behavior tests for the spec's combat, simultaneous-contact and
  restart scenarios, including deterministic robot behavior where needed.
- [x] Implement keyboard and gamepad input, focus handling and vector drawing;
  show controls and clear win/loss and restart states.
- [x] Integrate workspace commands and app documentation; update architecture
  documentation to reflect the new app.
- [x] Adapt the original recursive-division room generator to this enclosed
  room, and verify maze passages and safe starting positions.
- [ ] Run checks and playtest controls, combat and layout at varied viewport
  sizes; tune and update the spec's implementation status and lasting decisions.

## Verification

- Tests: Library (28), Asteroids (34), and Very Angry Robots (22) passed.
- Type checking: Passed as part of workspace build.
- Build: Workspace build and a subsequent Very Angry Robots build passed.
- Browser, keyboard and gamepad playtesting: Not run; no browser or gamepad
  was available in the execution environment. The initial simulation test run
  failed while under development; the completed suite passes.

## Open questions

- Initial layout, tuning and vector designs need playtesting. Gamepad testing
  depends on access to a standard-mapped controller; record any limitation.

## Next action

Run `npm run dev:robots` in a browser and playtest the spec's scenarios with
keyboard and a standard gamepad at narrow and wide sizes; tune as needed.

## Completion criteria

- [ ] All accepted single-room behaviors are implemented and lasting decisions
  and implementation status are recorded in the app spec.
- [ ] Relevant automated checks and the spec's manual review scenarios have
  been performed, with results and any limitations recorded.
- [ ] No unresolved work remains within the agreed scope.
