import assert from "node:assert/strict";
import test from "node:test";

import { InputDevices, type KeyboardEntry } from "../src/index.ts";

test("a gameplay press persists through release until read, while held state survives reads", () => {
  const devices = new InputDevices();
  const left = { code: "ArrowLeft", key: "ArrowLeft" };
  devices.keyDown("ArrowLeft", "ArrowLeft");
  devices.keyDown("KeyA", "A");
  devices.keyUp("KeyA", "a");

  assert.deepEqual(devices.read([]).keyboard, {
    down: [left],
    pressed: [left, { code: "KeyA", key: "a" }],
  });
  devices.keyDown("ArrowLeft", "ArrowLeft", true);
  devices.keyDown("ArrowLeft", "ArrowLeft");
  assert.deepEqual(devices.read([]).keyboard, { down: [left], pressed: [] });
  devices.keyUp("ArrowLeft", "Changed");
  assert.deepEqual(devices.read([]).keyboard, { down: [], pressed: [] });
});

test("pressed entries coalesce by identity and retain the first normalized key-down value", () => {
  const devices = new InputDevices();
  devices.keyDown("Digit1", "1");
  devices.keyUp("Digit1", "!");
  devices.keyDown("Digit1", "!");
  devices.keyDown("KeyA", "A");
  devices.keyDown("KeyB", "a");
  devices.keyDown(null, "A");
  devices.keyUp(null, "a");
  devices.keyDown(null, "a");
  const matchingValues = [
    { code: "KeyA", key: "a" },
    { code: "KeyB", key: "a" },
    { code: null, key: "a" },
  ];
  assert.deepEqual(devices.read([]).keyboard, {
    down: [{ code: "Digit1", key: "!" }, ...matchingValues],
    pressed: [{ code: "Digit1", key: "1" }, ...matchingValues],
  });
  devices.keyUp("KeyA", "Different");
  devices.keyUp(null, "A");
  assert.deepEqual(devices.read([]).keyboard, {
    down: [{ code: "Digit1", key: "!" }, { code: "KeyB", key: "a" }],
    pressed: [],
  });
});

test("individual and modal suppression survive further key-downs until the matching key-up", () => {
  const devices = new InputDevices();
  devices.keyDown("KeyP", "p");
  devices.keyUp("KeyP", "p");
  devices.blockKeyUntilReleased("KeyP", "p");
  const enter = { code: "Enter", key: "Enter" };
  devices.keyDown("Enter", "Enter");
  assert.deepEqual(devices.read([]).keyboard, { down: [enter], pressed: [enter] });
  devices.keyDown("Space", " ");
  devices.keyUp("Space", " ");
  devices.suppressKeyboardUntilReleased();
  devices.keyDown("Enter", "Enter");
  devices.keyDown("KeyP", "p");
  assert.deepEqual(devices.read([]).keyboard, { down: [], pressed: [] });

  devices.keyUp("Enter", "Enter");
  devices.keyUp("KeyP", "P");
  devices.keyDown("Enter", "Enter");
  devices.keyDown("KeyP", "P");
  const expected = [enter, { code: "KeyP", key: "p" }];
  assert.deepEqual(devices.read([]).keyboard, { down: expected, pressed: expected });
});

test("focus reset discards held, pending and blocked keys and ignores orphan repeats", () => {
  const devices = new InputDevices();
  devices.keyDown("KeyA", "a");
  devices.keyDown("KeyB", "b");
  devices.blockKeyUntilReleased("KeyB", "b");
  devices.clearKeyboard();
  devices.keyDown("KeyA", "a", true);
  devices.keyDown("KeyB", "b", true);
  assert.deepEqual(devices.read([]).keyboard, { down: [], pressed: [] });
  devices.keyDown("KeyA", "a");
  devices.keyDown("KeyB", "b");
  const entries = [{ code: "KeyA", key: "a" }, { code: "KeyB", key: "b" }];
  assert.deepEqual(devices.read([]).keyboard, { down: entries, pressed: entries });
});

function pad(connectionId: string, ...buttons: boolean[]) {
  return { connectionId, axes: [0.12, -0.7], buttons };
}

test("gamepad axes pass through, first held buttons wait for release, and edges occur once", () => {
  const devices = new InputDevices();
  const held = pad("controller", true);
  const released = pad("controller", false);
  const idle = {
    connectionId: "controller",
    axes: held.axes,
    buttonsDown: new Set(),
    buttonsPressed: new Set(),
  };
  assert.deepEqual(devices.read([held]).gamepads, [idle]);
  assert.deepEqual(devices.read([held]).gamepads, [idle]);
  assert.deepEqual(devices.read([released]).gamepads, [idle]);
  assert.deepEqual(devices.read([held]).gamepads, [{
    ...idle, buttonsDown: new Set([0]), buttonsPressed: new Set([0]),
  }]);
  assert.deepEqual(devices.read([held]).gamepads, [{ ...idle, buttonsDown: new Set([0]) }]);
  assert.deepEqual(devices.read([released]).gamepads, [idle]);
  // A complete tap between snapshots has no representation in the sampled input.
  assert.deepEqual(devices.read([released]).gamepads, [idle]);
  assert.deepEqual(devices.read([held]).gamepads, [{
    ...idle, buttonsDown: new Set([0]), buttonsPressed: new Set([0]),
  }]);
});

test("transition suppression samples held buttons and releases without affecting other devices", () => {
  const devices = new InputDevices();
  devices.read([pad("one", true, false), pad("two", false)]);
  const left = { code: "ArrowLeft", key: "ArrowLeft" };
  devices.keyDown("ArrowLeft", "ArrowLeft");
  devices.suppressGamepadButtonsWhileHeld(pad("one", false, true));
  const frame = devices.read([pad("two", true), pad("one", true, true)]);
  assert.deepEqual(frame.keyboard, { down: [left], pressed: [left] });
  assert.deepEqual(frame.gamepads.map(({ connectionId, buttonsDown, buttonsPressed }) => (
    [connectionId, [...buttonsDown], [...buttonsPressed]]
  )), [["two", [0], [0]], ["one", [0], [0]]]);
  devices.clearKeyboard();
  const again = devices.read([pad("one", true, false), pad("two", true)]);
  assert.deepEqual(again.gamepads.map(({ buttonsDown, buttonsPressed }) => (
    [[...buttonsDown], [...buttonsPressed]]
  )), [[[0], []], [[0], []]]);
  assert.deepEqual(devices.read([pad("one", true, true), pad("two", true)])
    .gamepads.map(({ buttonsPressed }) => [...buttonsPressed]), [[1], []]);
});

test("omission drops a connection's history and a replacement token starts independently", () => {
  const devices = new InputDevices();
  devices.read([pad("one", false), pad("two", false)]);
  assert.deepEqual(devices.read([pad("one", true), pad("two", true)])
    .gamepads.map(({ buttonsPressed }) => [...buttonsPressed]), [[0], [0]]);
  assert.deepEqual(devices.read([pad("two", true), pad("replacement", true)])
    .gamepads.map(({ buttonsDown }) => [...buttonsDown]), [[0], []]);
  assert.deepEqual(devices.read([pad("one", true), pad("two", true)])
    .gamepads.map(({ buttonsDown }) => [...buttonsDown]), [[], [0]]);
  assert.deepEqual(devices.read([]).gamepads, []);
  assert.deepEqual(devices.read([pad("two", true)]).gamepads[0]?.buttonsDown, new Set());
});

test("duplicate connection IDs reject the whole read without consuming state", () => {
  const devices = new InputDevices();
  devices.read([pad("one", false), pad("two", false)]);
  devices.keyDown("KeyZ", "Z");
  assert.throws(() => devices.read([pad("one", true), pad("one", false)]), /duplicate/i);
  const frame = devices.read([pad("one", true), pad("two", true)]);
  assert.deepEqual(frame.keyboard.pressed, [{ code: "KeyZ", key: "z" }]);
  assert.deepEqual(frame.gamepads.map(({ buttonsPressed }) => [...buttonsPressed]), [[0], [0]]);
});

test("caller mutations and later reads do not change retained state or frames", () => {
  const devices = new InputDevices();
  devices.read([pad("one", false, false)]);
  devices.keyDown("KeyA", "A");
  const snapshot = pad("one", true, false);
  const first = devices.read([snapshot]);
  snapshot.buttons[0] = false;
  snapshot.axes[0] = 0;
  assert.deepEqual(first.gamepads[0]?.axes, [0.12, -0.7]);
  assert.deepEqual(first.gamepads[0]?.buttonsDown, new Set([0]));

  const { down, pressed } = first.keyboard;
  (down as KeyboardEntry[])[0]!.key = "changed";
  assert.deepEqual(pressed, [{ code: "KeyA", key: "a" }]);
  (first.gamepads[0]?.buttonsDown as Set<number>).clear();

  const second = devices.read([pad("one", true, false)]);
  assert.deepEqual(second.keyboard.down, [{ code: "KeyA", key: "a" }]);
  assert.deepEqual(second.gamepads[0]?.buttonsDown, new Set([0]));
  assert.deepEqual(second.gamepads[0]?.buttonsPressed, new Set());
  assert.deepEqual(first.gamepads[0]?.buttonsPressed, new Set([0]));
  assert.deepEqual(first.gamepads[0]?.buttonsDown, new Set());
});
