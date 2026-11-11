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
