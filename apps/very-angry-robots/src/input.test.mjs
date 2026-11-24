import test from "node:test";
import assert from "node:assert/strict";
import { GamepadConnections, InputController, TouchInputModel } from "./input.ts";

function snapshot({ leftX = 0, leftY = 0, rightX = 0, rightY = 0, startPressed = false, backPressed = false } = {},
  connectionId = "pad") {
  const buttons = Array(10).fill(false);
  buttons[8] = backPressed;
  buttons[9] = startPressed;
  return { connectionId, axes: [leftX, leftY, rightX, rightY], buttons };
}

test("keyboard movement and aiming are independent and support diagonals", () => {
  const input = new InputController();
  input.keyDown("KeyW", "w");
  input.keyDown("ArrowRight", "ArrowRight");
  assert.deepEqual(input.read(), {
    move: { x: 0, y: -1 },
    aim: { x: 1, y: 0 },
    startPressed: false,
    pausePressed: false,
    settingsPressed: false,
    gamepad: undefined,
    screenAdvancePressed: true,
    initialsSlotDelta: 0,
    initialsCharDelta: 0,
  });

  input.keyDown("KeyD", "d");
  input.keyDown("ArrowUp", "ArrowUp");
  const state = input.read();
  assert.ok(Math.abs(state.move.x - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(state.move.y + Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(state.aim.x - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(state.aim.y + Math.SQRT1_2) < 1e-12);
});

test("releasing keys and clearing keyboard state stop movement and firing", () => {
  const input = new InputController();
  input.keyDown("KeyA", "a");
  input.keyDown("ArrowDown", "ArrowDown");
  input.keyUp("KeyA", "a");
  assert.deepEqual(input.read().move, { x: 0, y: 0 });
  assert.deepEqual(input.read().aim, { x: 0, y: 1 });

  input.clearForFocusLoss();
  assert.deepEqual(input.read().aim, { x: 0, y: 0 });
});

test("Enter starts on a fresh press, ignores repeats and can be pressed again after release", () => {
  const input = new InputController();
  assert.equal(input.keyDown("Enter", "Enter"), true);
  assert.equal(input.read().startPressed, true);
  assert.equal(input.keyDown("Enter", "Enter", true), true);
  assert.equal(input.read().startPressed, false);
  input.keyUp("Enter", "Enter");
  input.keyDown("Enter", "Enter");
  assert.equal(input.read().startPressed, true);
});

test("gamepad sticks move and aim independently with a radial dead zone", () => {
  const input = new InputController();
  let state = input.read([snapshot({ leftX: 0.1, leftY: 0, rightX: 0, rightY: -0.2, startPressed: false })]);
  assert.deepEqual(state.move, { x: 0, y: 0 });
  assert.deepEqual(state.aim, { x: 0, y: 0 });

  state = input.read([snapshot({ leftX: 0.8, leftY: -0.8, rightX: -1, rightY: 0, startPressed: false })]);
  assert.ok(Math.abs(Math.hypot(state.move.x, state.move.y) - 1) < 1e-12);
  assert.ok(state.move.x > 0 && state.move.y < 0);
  assert.deepEqual(state.aim, { x: -1, y: 0 });

  state = input.read([snapshot({ leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: false })]);
  assert.deepEqual(state.move, { x: 0, y: 0 });
  assert.deepEqual(state.aim, { x: 0, y: 0 });
});

test("gamepad vectors snap to the nearest of eight normalized directions", () => {
  const input = new InputController();
  const state = input.read([snapshot({
    leftX: Math.cos(Math.PI / 8),
    leftY: Math.sin(Math.PI / 8),
    rightX: -0.7,
    rightY: -0.7,
    startPressed: false,
  })]);
  assert.ok(Math.abs(state.move.x - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(state.move.y - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(Math.hypot(state.move.x, state.move.y) - 1) < 1e-12);
  assert.deepEqual(state.aim, { x: -Math.SQRT1_2, y: -Math.SQRT1_2 });
});

test("keyboard and gamepad directions combine without exceeding unit magnitude", () => {
  const input = new InputController();
  input.keyDown("KeyD", "d");
  const state = input.read([snapshot({ leftX: 1, leftY: 0, rightX: 0, rightY: 0, startPressed: false })]);
  assert.deepEqual(state.move, { x: 1, y: 0 });
});

test("gamepad Start is edge-triggered and must be released before it starts again", () => {
  const input = new InputController();
  const pressed = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: true };
  const released = { ...pressed, startPressed: false };
  assert.equal(input.read([snapshot(pressed)]).startPressed, false);
  assert.equal(input.read([snapshot(pressed)]).startPressed, false);
  assert.equal(input.read([snapshot(released)]).startPressed, false);
  assert.equal(input.read([snapshot(pressed)]).startPressed, true);
});

test("physical gameplay keys use their code even on a different keyboard layout", () => {
  const input = new InputController();
  assert.equal(input.keyDown("KeyW", "z"), true);
  assert.equal(input.keyDown("KeyZ", "w"), false);
  assert.equal(input.keyDown("", "w"), false);
  assert.deepEqual(input.read().move, { x: 0, y: -1 });
  input.keyUp("KeyW", "Z");
  assert.deepEqual(input.read().move, { x: 0, y: 0 });
});

test("keyboard directions advance once per press while movement remains held", () => {
  const input = new InputController();
  input.keyDown("ArrowLeft", "ArrowLeft");
  assert.equal(input.read().screenAdvancePressed, true);
  assert.equal(input.read().screenAdvancePressed, false);
  input.keyDown("ArrowLeft", "ArrowLeft", true);
  assert.equal(input.read().screenAdvancePressed, false);
  input.keyUp("ArrowLeft", "ArrowLeft");
  input.keyDown("ArrowLeft", "ArrowLeft");
  assert.equal(input.read().screenAdvancePressed, true);
});

test("either gamepad stick advances once until both sticks return to neutral", () => {
  const input = new InputController();
  const neutral = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: false };
  const left = { ...neutral, leftX: 0.5 };
  const right = { ...neutral, rightY: 0.6 };
  assert.equal(input.read([snapshot(left)]).screenAdvancePressed, true);
  assert.equal(input.read([snapshot(right)]).screenAdvancePressed, false);
  assert.equal(input.read([snapshot(neutral)]).screenAdvancePressed, false);
  assert.equal(input.read([snapshot(right)]).screenAdvancePressed, true);
});

test("gamepad initials controls step once and rearm in their neutral dead zones", () => {
  const input = new InputController();
  const neutral = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: false };
  assert.deepEqual(input.read([snapshot({ ...neutral, leftX: -0.8, rightY: 0.9 })]), {
    move: { x: -1, y: 0 },
    aim: { x: 0, y: 1 },
    startPressed: false,
    pausePressed: false,
    settingsPressed: false,
    gamepad: { connectionId: "pad", axes: [-0.8, 0, 0, 0.9], buttonsDown: new Set(), buttonsPressed: new Set() },
    screenAdvancePressed: true,
    initialsSlotDelta: -1,
    initialsCharDelta: 1,
  });
  assert.deepEqual(input.read([snapshot({ ...neutral, leftX: -0.7, rightY: 0.8 })]).initialsSlotDelta, 0);
  assert.equal(input.read([snapshot({ ...neutral, leftX: 0.1, rightY: -0.1 })]).initialsSlotDelta, 0);
  const next = input.read([snapshot({ ...neutral, leftX: 0.9, rightY: -0.9 })]);
  assert.equal(next.initialsSlotDelta, 1);
  assert.equal(next.initialsCharDelta, -1);
});

test("pause and settings shortcuts are one-read edges in the input snapshot", () => {
  const input = new InputController();
  input.keyDown("KeyP", "p");
  input.keyDown("KeyP", "p", true);
  assert.equal(input.read().pausePressed, true);
  assert.equal(input.read().pausePressed, false);
  input.keyDown("KeyS", "s");
  assert.equal(input.read().settingsPressed, true);
  assert.equal(input.read().settingsPressed, false);
  input.keyUp("KeyP", "p");
  input.keyUp("KeyS", "s");

  const pad = { leftX: 0, leftY: 0, rightX: 0, rightY: 0, startPressed: true, backPressed: false };
  input.read([snapshot()]);
  let state = input.read([snapshot(pad)]);
  assert.equal(state.pausePressed, true);
  assert.equal(state.startPressed, true);
  state = input.read([snapshot(pad)]);
  assert.equal(state.pausePressed, false);
  assert.equal(state.startPressed, false);
  input.read([snapshot({ ...pad, startPressed: false })]);
  state = input.read([snapshot({ ...pad, startPressed: true, backPressed: true })]);
  assert.equal(state.pausePressed, true);
  assert.equal(state.settingsPressed, true);
});

test("clearing keyboard input discards pending pause and settings actions and held controls", () => {
  const input = new InputController();
  input.keyDown("KeyP", "p"); input.keyDown("KeyS", "s"); input.keyDown("KeyW", "w");
  input.clearForFocusLoss();
  input.keyDown("KeyW", "w", true);
  const state = input.read();
  assert.equal(state.pausePressed, false);
  assert.equal(state.settingsPressed, false);
  assert.deepEqual(state.move, { x: 0, y: 0 });
});

test("focus reset accepts a fresh press without observing the previous key-up", () => {
  const input = new InputController();
  input.keyDown("KeyP", "p");
  input.clearForFocusLoss();
  input.keyDown("KeyP", "p", true);
  assert.equal(input.read().pausePressed, false);
  input.keyDown("KeyP", "p");
  assert.equal(input.read().pausePressed, true);
});

test("a modal consumes queued edges and holds its gameplay keys until release", () => {
  const input = new InputController();
  input.keyDown("KeyP", "p");
  input.keyUp("KeyP", "p");
  input.keyDown("KeyW", "z");
  input.suppressKeyboardUntilReleased();
  input.blockKey("Enter", "Enter");
  input.keyDown("KeyW", "z");
  input.keyDown("Enter", "Enter");
  let frame = input.read();
  assert.equal(frame.pausePressed, false);
  assert.equal(frame.startPressed, false);
  assert.deepEqual(frame.move, { x: 0, y: 0 });

  input.keyUp("KeyW", "z");
  input.keyUp("Enter", "Enter");
  input.keyDown("KeyW", "z");
  input.keyDown("Enter", "Enter");
  frame = input.read();
  assert.equal(frame.startPressed, true);
  assert.deepEqual(frame.move, { x: 0, y: -1 });
});

function browserPad(index, { id = "Controller", mapping = "standard", ...state } = {}) {
  const { axes, buttons } = snapshot(state);
  return { index, id, mapping, connected: true, axes, buttons: buttons.map((pressed) => ({ pressed })) };
}

test("the first standard gamepad controls the app and reconnects with fresh button history", () => {
  const connections = new GamepadConnections();
  const input = new InputController();
  const generic = browserPad(0, { mapping: "", startPressed: true });
  const first = browserPad(1, { rightY: 0.8, startPressed: true });
  const second = browserPad(2);
  const initial = connections.snapshot([generic, first, second]);
  let frame = input.read(initial);
  assert.equal(initial.length, 2);
  assert.equal(frame.gamepad.connectionId, initial[0].connectionId);
  assert.equal(frame.startPressed, false);
  assert.deepEqual(frame.aim, { x: 0, y: 1 });

  connections.forget(first.index);
  const replaced = connections.snapshot([generic, first, second]);
  assert.notEqual(replaced[0].connectionId, initial[0].connectionId);
  assert.equal(replaced[1].connectionId, initial[1].connectionId);
  assert.equal(input.read(replaced).startPressed, false);

  input.read(connections.snapshot([generic, browserPad(1), second]));
  frame = input.read(connections.snapshot([generic, first, second]));
  assert.equal(frame.startPressed, true);
  assert.equal(frame.gamepad.buttonsPressed.has(9), true);

  connections.clear();
  const afterFocus = connections.snapshot([generic, first, second]);
  assert.notEqual(afterFocus[0].connectionId, replaced[0].connectionId);
  assert.equal(input.read(afterFocus).startPressed, false);
});

test("gamepad enumeration retires omitted indices and recognizes changed device IDs", () => {
  const connections = new GamepadConnections();
  const gamepad = browserPad(1);
  const [first] = connections.snapshot([null, gamepad]);
  connections.snapshot([null, null]);
  const [reappeared] = connections.snapshot([null, gamepad]);
  const [replaced] = connections.snapshot([null, browserPad(1, { id: "Other model" })]);
  assert.notEqual(reappeared.connectionId, first.connectionId);
  assert.notEqual(replaced.connectionId, reappeared.connectionId);
});

test("gamepad controls held across a screen transition stay suppressed until released", () => {
  const input = new InputController();
  const held = { leftX: 0.8, leftY: 0, rightX: 0, rightY: 0, startPressed: true, backPressed: true };
  input.suppressGamepadWhileHeld([snapshot(held)]);
  const state = input.read([snapshot(held)]);
  assert.deepEqual(state.move, { x: 0, y: 0 });
  assert.equal(state.startPressed, false);
  assert.equal(state.pausePressed, false);
  assert.equal(state.settingsPressed, false);

  input.read([snapshot({ ...held, leftX: 0, startPressed: false, backPressed: false })]);
  const fresh = input.read([snapshot({ ...held, leftX: 0.8 })]);
  assert.ok(fresh.move.x > 0);
  assert.equal(fresh.startPressed, true);
  assert.equal(fresh.settingsPressed, true);
});

test("touch sticks quantize displacement to the eight normalized directions", () => {
  const input = new TouchInputModel();
  const directions = [
    [1, 0, { x: 1, y: 0 }],
    [1, 1, { x: Math.SQRT1_2, y: Math.SQRT1_2 }],
    [0, 1, { x: 0, y: 1 }],
    [-1, 1, { x: -Math.SQRT1_2, y: Math.SQRT1_2 }],
    [-1, 0, { x: -1, y: 0 }],
    [-1, -1, { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }],
    [0, -1, { x: 0, y: -1 }],
    [1, -1, { x: Math.SQRT1_2, y: -Math.SQRT1_2 }],
  ];

  for (const [dx, dy, expected] of directions) {
    input.pointerDown("move", 1, dx, dy);
    assert.deepEqual(input.read().move, expected);
    input.pointerUp(1);
  }
});

test("touch sticks have a neutral zone and aim remains after fire is released", () => {
  const input = new TouchInputModel();
  input.pointerDown("aim", 5, 0.1, 0);
  assert.deepEqual(input.read(), { move: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, fire: false });

  input.pointerMove(5, 0.8, 0.1);
  assert.deepEqual(input.read(), { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, fire: true });
  input.pointerMove(5, 0.12, 0.02);
  assert.deepEqual(input.read(), { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, fire: false });
});

test("touch pointers control independent sticks and release only their own stick", () => {
  const input = new TouchInputModel();
  assert.equal(input.pointerDown("move", 10, 0, -1), true);
  assert.equal(input.pointerDown("aim", 20, 1, 0), true);
  assert.equal(input.pointerDown("move", 30, -1, 0), false);
  assert.deepEqual(input.read(), {
    move: { x: 0, y: -1 }, aim: { x: 1, y: 0 }, fire: true,
  });

  assert.equal(input.pointerUp(10), true);
  assert.equal(input.pointerUp(10), false);
  assert.deepEqual(input.read(), {
    move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, fire: true,
  });

  input.clear();
  assert.deepEqual(input.read(), {
    move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, fire: false,
  });
});

test("touch cancellation releases only the canceled pointer and permits reuse", () => {
  const input = new TouchInputModel();
  input.pointerDown("move", 31, 1, 0);
  input.pointerDown("aim", 32, 0, -1);

  assert.equal(input.pointerCancel(31), true);
  assert.equal(input.pointerCancel(31), false);
  assert.deepEqual(input.read(), {
    move: { x: 0, y: 0 }, aim: { x: 0, y: -1 }, fire: true,
  });

  assert.equal(input.pointerDown("move", 31, -1, 0), true);
  assert.deepEqual(input.read().move, { x: -1, y: 0 });
});

test("clearing touch input on focus loss or screen changes releases every active pointer", () => {
  const input = new TouchInputModel();
  input.pointerDown("move", 41, 0, 1);
  input.pointerDown("aim", 42, 1, 0);
  input.clear();

  assert.deepEqual(input.read(), {
    move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, fire: false,
  });
  assert.equal(input.pointerMove(41, -1, 0), false);
  assert.equal(input.pointerUp(42), false);
});
