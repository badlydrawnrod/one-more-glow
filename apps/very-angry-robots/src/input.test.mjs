import test from "node:test";
import assert from "node:assert/strict";
import { InputController } from "./input.ts";

test("keyboard movement and aiming are independent and support diagonals", () => {
  const input = new InputController();
  input.keyDown("w");
  input.keyDown("ArrowRight");
  assert.deepEqual(input.read(), {
    move: { x: 0, y: -1 },
    aim: { x: 1, y: 0 },
    startPressed: false,
    pausePressed: false,
    settingsPressed: false,
    keyPresses: ["W"],
    screenAdvancePressed: true,
    initialsSlotDelta: 0,
    initialsCharDelta: 0,
  });

  input.keyDown("d");
  input.keyDown("ArrowUp");
  const state = input.read();
  assert.ok(Math.abs(state.move.x - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(state.move.y + Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(state.aim.x - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(state.aim.y + Math.SQRT1_2) < 1e-12);
});

test("releasing keys and clearing keyboard state stop movement and firing", () => {
  const input = new InputController();
  input.keyDown("a");
  input.keyDown("ArrowDown");
  input.keyUp("a");
  assert.deepEqual(input.read().move, { x: 0, y: 0 });
  assert.deepEqual(input.read().aim, { x: 0, y: 1 });

  input.clearKeyboard();
  assert.deepEqual(input.read().aim, { x: 0, y: 0 });
});

test("Enter starts on a fresh press, ignores repeats and can be pressed again after release", () => {
  const input = new InputController();
  assert.equal(input.keyDown("Enter"), true);
  assert.equal(input.read().startPressed, true);
  assert.equal(input.keyDown("Enter", true), true);
  assert.equal(input.read().startPressed, false);
  input.keyUp("Enter");
  input.keyDown("Enter");
  assert.equal(input.read().startPressed, true);
});

test("gamepad sticks move and aim independently with a radial dead zone", () => {
  const input = new InputController();
  let state = input.read({ leftX: 0.1, leftY: 0, rightX: 0, rightY: -0.2, startPressed: false });
  assert.deepEqual(state.move, { x: 0, y: 0 });
  assert.deepEqual(state.aim, { x: 0, y: 0 });

  state = input.read({ leftX: 0.8, leftY: -0.8, rightX: -1, rightY: 0, startPressed: false });
  assert.ok(Math.abs(Math.hypot(state.move.x, state.move.y) - 1) < 1e-12);
  assert.ok(state.move.x > 0 && state.move.y < 0);
  assert.deepEqual(state.aim, { x: -1, y: 0 });

  state = input.read({ leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: false });
  assert.deepEqual(state.move, { x: 0, y: 0 });
  assert.deepEqual(state.aim, { x: 0, y: 0 });
});

test("gamepad vectors snap to the nearest of eight normalized directions", () => {
  const input = new InputController();
  const state = input.read({
    leftX: Math.cos(Math.PI / 8),
    leftY: Math.sin(Math.PI / 8),
    rightX: -0.7,
    rightY: -0.7,
    startPressed: false,
  });
  assert.ok(Math.abs(state.move.x - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(state.move.y - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(Math.hypot(state.move.x, state.move.y) - 1) < 1e-12);
  assert.deepEqual(state.aim, { x: -Math.SQRT1_2, y: -Math.SQRT1_2 });
});

test("keyboard and gamepad directions combine without exceeding unit magnitude", () => {
  const input = new InputController();
  input.keyDown("d");
  const state = input.read({ leftX: 1, leftY: 0, rightX: 0, rightY: 0, startPressed: false });
  assert.deepEqual(state.move, { x: 1, y: 0 });
});

test("gamepad Start is edge-triggered and must be released before it starts again", () => {
  const input = new InputController();
  const pressed = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: true };
  const released = { ...pressed, startPressed: false };
  assert.equal(input.read(pressed).startPressed, true);
  assert.equal(input.read(pressed).startPressed, false);
  assert.equal(input.read(released).startPressed, false);
  assert.equal(input.read(pressed).startPressed, true);
});

test("letter and Backspace presses are one-shot keyboard events", () => {
  const input = new InputController();
  assert.equal(input.keyDown("a"), true);
  assert.equal(input.keyDown("A", true), true);
  assert.equal(input.read().keyPresses.join(","), "A");
  assert.deepEqual(input.read().keyPresses, []);

  input.keyUp("a");
  input.keyDown("z");
  input.keyDown("Backspace");
  assert.deepEqual(input.read().keyPresses, ["Z", "Backspace"]);
  input.keyDown("Backspace", true);
  assert.deepEqual(input.read().keyPresses, []);
});

test("keyboard directions advance once per press while movement remains held", () => {
  const input = new InputController();
  input.keyDown("ArrowLeft");
  assert.equal(input.read().screenAdvancePressed, true);
  assert.equal(input.read().screenAdvancePressed, false);
  input.keyDown("ArrowLeft", true);
  assert.equal(input.read().screenAdvancePressed, false);
  input.keyUp("ArrowLeft");
  input.keyDown("ArrowLeft");
  assert.equal(input.read().screenAdvancePressed, true);
});

test("either gamepad stick advances once until both sticks return to neutral", () => {
  const input = new InputController();
  const neutral = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: false };
  const left = { ...neutral, leftX: 0.5 };
  const right = { ...neutral, rightY: 0.6 };
  assert.equal(input.read(left).screenAdvancePressed, true);
  assert.equal(input.read(right).screenAdvancePressed, false);
  assert.equal(input.read(neutral).screenAdvancePressed, false);
  assert.equal(input.read(right).screenAdvancePressed, true);
});

test("gamepad initials controls step once and rearm in their neutral dead zones", () => {
  const input = new InputController();
  const neutral = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: false };
  assert.deepEqual(input.read({ ...neutral, leftX: -0.8, rightY: 0.9 }), {
    move: { x: -1, y: 0 },
    aim: { x: 0, y: 1 },
    startPressed: false,
    pausePressed: false,
    settingsPressed: false,
    keyPresses: [],
    screenAdvancePressed: true,
    initialsSlotDelta: -1,
    initialsCharDelta: 1,
  });
  assert.deepEqual(input.read({ ...neutral, leftX: -0.7, rightY: 0.8 }).initialsSlotDelta, 0);
  assert.equal(input.read({ ...neutral, leftX: 0.1, rightY: -0.1 }).initialsSlotDelta, 0);
  const next = input.read({ ...neutral, leftX: 0.9, rightY: -0.9 });
  assert.equal(next.initialsSlotDelta, 1);
  assert.equal(next.initialsCharDelta, -1);
});

test("pause and settings shortcuts are one-read edges in the input snapshot", () => {
  const input = new InputController();
  input.keyDown("p");
  input.keyDown("p", true);
  assert.equal(input.read().pausePressed, true);
  assert.equal(input.read().pausePressed, false);
  input.keyDown("s");
  assert.equal(input.read().settingsPressed, true);
  assert.equal(input.read().settingsPressed, false);
  input.keyUp("p");
  input.keyUp("s");

  const pad = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: true, backPressed: false };
  let state = input.read(pad);
  assert.equal(state.pausePressed, true);
  assert.equal(state.startPressed, true);
  state = input.read(pad);
  assert.equal(state.pausePressed, false);
  assert.equal(state.startPressed, false);
  input.read({ ...pad, startPressed: false });
  state = input.read({ ...pad, startPressed: true, backPressed: true });
  assert.equal(state.pausePressed, true);
  assert.equal(state.settingsPressed, true);
});

test("clearing keyboard input discards pending pause and settings actions and held controls", () => {
  const input = new InputController();
  input.keyDown("p"); input.keyDown("s"); input.keyDown("w");
  input.clearKeyboard();
  const state = input.read();
  assert.equal(state.pausePressed, false);
  assert.equal(state.settingsPressed, false);
  assert.deepEqual(state.move, { x: 0, y: 0 });
});

test("gamepad controls held across a screen transition stay suppressed until released", () => {
  const input = new InputController();
  const held = { leftX: 0.8, leftY: 0, rightX: 0, rightY: 0, startPressed: true, backPressed: true };
  input.suppressGamepadWhileHeld(held);
  const state = input.read(held);
  assert.deepEqual(state.move, { x: 0, y: 0 });
  assert.equal(state.startPressed, false);
  assert.equal(state.pausePressed, false);
  assert.equal(state.settingsPressed, false);

  input.read({ ...held, leftX: 0, startPressed: false, backPressed: false });
  const fresh = input.read({ ...held, leftX: 0.8 });
  assert.ok(fresh.move.x > 0);
  assert.equal(fresh.startPressed, true);
  assert.equal(fresh.settingsPressed, true);
});
