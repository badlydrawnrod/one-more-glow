import test from "node:test";
import assert from "node:assert/strict";
import { GyrussInput, gameplay } from "./input.ts";

function gamepad({ index = 0, id = `pad-${index}`, mapping = "standard", connected = true, axes = [], buttons = [] } = {}) {
  return {
    index,
    id,
    mapping,
    connected,
    axes,
    buttons: buttons.map((pressed) => ({ pressed })),
  };
}

const noPads = [];

test("selected controller waits for continuous neutral on selection and focus recovery", () => {
  const input = new GyrussInput();
  const read = (pads, time, focused = true) => input.controls(input.read(pads), time, focused);
  const idle = gamepad();
  const held = gamepad({ axes: [0.8], buttons: [true] });
  assert.deepEqual(read([held], 0), { turn: 0, fire: false, connected: true, restartPressed: false });
  read([idle], 100);
  assert.equal(read([idle], 199).turn, 0);
  assert.equal(read([held], 200).turn, 0);
  read([idle], 400);
  read([idle], 500);
  assert.equal(read([held], 501).turn, 0.8);
  input.blur();
  assert.equal(read([held], 700, false).turn, 0);
  assert.equal(read([held], 800).fire, false);
  read([idle], 900);
  read([idle], 1000);
  assert.equal(read([held], 1001).fire, true);
  input.forgetConnection(9);
  assert.equal(read([held], 1200).turn, 0.8);
  assert.equal(read([gamepad({ index: 1, axes: [1] })], 1300).turn, 0);
});

test("keyboard mappings use key values, report preventDefault policy, and ignore repeats", () => {
  const input = new GyrussInput();
  assert.equal(input.keyDown({ code: "KeyQ", key: "a", repeat: false }), true);
  assert.deepEqual(gameplay(input.read(noPads)), { turn: -1, fire: false, connected: false, restartPressed: false });

  input.keyUp({ code: "KeyQ", key: "a" });
  input.keyDown({ code: "KeyA", key: "q", repeat: false });
  assert.deepEqual(gameplay(input.read(noPads)), { turn: 0, fire: false, connected: false, restartPressed: false });
  assert.equal(input.keyDown({ code: "KeyD", key: "d", repeat: false }), true);
  assert.deepEqual(gameplay(input.read(noPads)).turn, 1);

  input.keyUp({ code: "KeyD", key: "d" });
  for (const [code, key] of [["Space", " "], ["ArrowUp", "ArrowUp"], ["KeyY", "Z"]]) {
    assert.equal(input.keyDown({ code, key, repeat: false }), true);
    assert.equal(gameplay(input.read(noPads)).fire, true);
    input.keyUp({ code, key });
    assert.equal(gameplay(input.read(noPads)).fire, false);
  }
  assert.equal(input.keyDown({ code: "KeyR", key: "r", repeat: false }), false);
  assert.equal(gameplay(input.read(noPads)).restartPressed, true);
  input.keyDown({ code: "KeyR", key: "r", repeat: true });
  assert.equal(input.keyDown({ code: "KeyD", key: "d", repeat: true }), true);
  assert.equal(gameplay(input.read(noPads)).turn, 0);
  assert.equal(gameplay(input.read(noPads)).restartPressed, false);
});

test("keyboard turn combines opposing keys and blur clearing removes held and pending state", () => {
  const input = new GyrussInput();
  input.keyDown({ code: "ArrowLeft", key: "ArrowLeft", repeat: false });
  assert.equal(gameplay(input.read(noPads)).turn, -1);
  input.keyDown({ code: "ArrowRight", key: "ArrowRight", repeat: false });
  assert.equal(gameplay(input.read(noPads)).turn, 0);
  input.keyUp({ code: "ArrowLeft", key: "ArrowLeft" });
  assert.equal(gameplay(input.read(noPads)).turn, 1);
  input.keyDown({ code: "KeyZ", key: "z", repeat: false });
  input.keyDown({ code: "KeyR", key: "r", repeat: false });
  input.clearKeyboard();
  assert.deepEqual(gameplay(input.read(noPads)), { turn: 0, fire: false, connected: false, restartPressed: false });
});

test("axis threshold is strict, takes precedence over D-pad, and turn is clamped", () => {
  const input = new GyrussInput();
  const left = Array.from({ length: 16 }, (_, i) => i === 14);
  const right = Array.from({ length: 16 }, (_, i) => i === 15);
  assert.equal(gameplay(input.read([gamepad({ axes: [0.15999] })])).turn, 0);
  assert.equal(gameplay(input.read([gamepad({ axes: [0.16], buttons: right })])).turn, 1);
  assert.equal(gameplay(input.read([gamepad({ axes: [-0.16], buttons: left })])).turn, -1);
  assert.equal(gameplay(input.read([gamepad({ axes: [0.16001], buttons: left })])).turn, 0.16001);

  input.keyDown({ code: "ArrowRight", key: "ArrowRight", repeat: false });
  assert.equal(gameplay(input.read([gamepad({ axes: [1] })])).turn, 1);
  input.keyDown({ code: "ArrowLeft", key: "ArrowLeft", repeat: false });
  assert.equal(gameplay(input.read([gamepad({ axes: [-1] })])).turn, -1);
  input.keyDown({ code: "KeyD", key: "d", repeat: false });
  assert.equal(gameplay(input.read([gamepad({ axes: [1] })])).turn, 1);
});

test("enumeration order selects gameplay pad, while any connected pad sets connected", () => {
  const input = new GyrussInput();
  const frame = input.read([
    gamepad({ index: 7, id: "nonstandard", mapping: "", axes: [-0.5], buttons: [true] }),
    gamepad({ index: 2, axes: [1], buttons: [true] }),
  ]);
  assert.equal(frame.gamepads.length, 2);
  assert.deepEqual(gameplay(frame), { turn: -0.5, fire: false, connected: true, restartPressed: false });
  assert.equal(gameplay(input.read([null, gamepad({ index: 2 })])).connected, true);
  assert.equal(gameplay(input.read([null])).connected, false);
});

test("button held on first observation is suppressed until release and fresh press", () => {
  const input = new GyrussInput();
  const held = gamepad({ buttons: [true] });
  assert.equal(gameplay(input.read([held])).fire, false);
  assert.equal(gameplay(input.read([held])).fire, false);
  assert.equal(gameplay(input.read([gamepad()])).fire, false);
  assert.equal(gameplay(input.read([held])).fire, true);
});

test("forgetting a connection resets held-button history even when identity is reused", () => {
  const input = new GyrussInput();
  const held = gamepad({ index: 4, id: "same", mapping: "standard", buttons: [true] });
  const idle = gamepad({ index: 4, id: "same" });
  const original = input.read([idle]).gamepads[0].connectionId;
  assert.equal(gameplay(input.read([held])).fire, true);
  input.forgetConnection(4);
  const reconnected = input.read([held]);
  assert.notEqual(reconnected.gamepads[0].connectionId, original);
  assert.equal(gameplay(reconnected).fire, false);
  assert.equal(gameplay(input.read([held])).fire, false);
  assert.equal(gameplay(input.read([gamepad({ index: 4, id: "same", buttons: [false] })])).fire, false);
  assert.equal(gameplay(input.read([held])).fire, true);
});

test("changed id or mapping and disappearance begin a fresh connection history", () => {
  const input = new GyrussInput();
  const token = (pad) => input.read([pad]).gamepads[0].connectionId;
  const original = token(gamepad({ id: "first" }));
  const changedId = token(gamepad({ id: "second" }));
  assert.notEqual(changedId, original);
  const unmapped = gamepad({ id: "second", mapping: "" });
  const changedMapping = token(unmapped);
  assert.notEqual(changedMapping, changedId);
  input.read([]);
  assert.notEqual(token(unmapped), changedMapping);
});
