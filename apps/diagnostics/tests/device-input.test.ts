import assert from "node:assert/strict";
import test from "node:test";
import { DiagnosticsDeviceInput, isGamepadNeutral } from "../src/device-input.ts";

function pad(index: number, buttons: boolean[] = [], axes: number[] = [], id = "test pad") {
  return {
    index,
    id,
    mapping: "standard",
    connected: true,
    buttons: buttons.map((pressed) => ({ pressed })),
    axes,
  } as unknown as Gamepad;
}

test("keyboard snapshots expose Escape presses and held state through the shared owner", () => {
  const input = new DiagnosticsDeviceInput();
  input.keyDown("Escape", "Escape", false);

  const first = input.read([]).frame.keyboard;
  assert.deepEqual(first.pressed, [{ code: "Escape", key: "Escape" }]);
  assert.deepEqual(first.down, [{ code: "Escape", key: "Escape" }]);
  assert.deepEqual(input.read([]).frame.keyboard.pressed, []);

  input.keyUp("Escape", "Escape");
  assert.deepEqual(input.read([]).frame.keyboard.down, []);
});

test("first observation and reconnection suppress held buttons under fresh connection tokens", () => {
  const input = new DiagnosticsDeviceInput();
  const held = pad(2, [true, false, false]);

  const first = input.read([held]).frame.gamepads[0];
  assert.ok(first);
  assert.deepEqual([...first.buttonsDown], []);
  assert.deepEqual([...first.buttonsPressed], []);

  input.read([pad(2)]);
  const freshPress = input.read([held]).frame.gamepads[0];
  assert.ok(freshPress);
  assert.deepEqual([...freshPress.buttonsPressed], [0]);
  const originalConnection = freshPress.connectionId;

  input.gamepadDisconnected(2);
  input.gamepadConnected(2);
  const reconnectedHeld = input.read([held]).frame.gamepads[0];
  assert.ok(reconnectedHeld);
  assert.notEqual(reconnectedHeld.connectionId, originalConnection);
  assert.deepEqual([...reconnectedHeld.buttonsDown], []);
  assert.deepEqual([...reconnectedHeld.buttonsPressed], []);
});

test("only the first connected standard-mapped controller is included", () => {
  const input = new DiagnosticsDeviceInput();
  const nonStandard = { ...pad(0, [true]), mapping: "" } as Gamepad;
  const standard = pad(1, [false, true], [0.5, -0.25]);

  const { frame, gamepad } = input.read([nonStandard, standard]);
  assert.equal(gamepad?.index, 1);
  assert.equal(frame.gamepads.length, 1);
  assert.deepEqual(frame.gamepads[0]?.axes, [0.5, -0.25]);
});

test("neutral gating requires every button released and the left stick inside the radial threshold", () => {
  assert.equal(isGamepadNeutral(pad(0)), true);
  assert.equal(isGamepadNeutral(pad(0, [false], [0.249, 0])), true);
  assert.equal(isGamepadNeutral(pad(0, [false], [0.25, 0])), false);
  assert.equal(isGamepadNeutral(pad(0, [true], [0, 0])), false);
});
