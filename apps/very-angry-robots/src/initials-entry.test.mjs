import test from "node:test";
import assert from "node:assert/strict";
import { createInitialsEntry, InitialsEditor, updateInitialsEntry } from "./initials-entry.ts";

const idle = { keyPresses: [], slotDelta: 0, charDelta: 0 };

test("keyboard typing advances the highlighted slot with each initial", () => {
  let entry = createInitialsEntry();
  entry = updateInitialsEntry(entry, { ...idle, keyPresses: ["R"] });
  assert.deepEqual(entry, { characters: ["R", "", ""], selectedSlot: 1 });

  entry = updateInitialsEntry(entry, { ...idle, keyPresses: ["O"] });
  assert.deepEqual(entry, { characters: ["R", "O", ""], selectedSlot: 2 });

  entry = updateInitialsEntry(entry, { ...idle, keyPresses: ["D"] });
  assert.deepEqual(entry, { characters: ["R", "O", "D"], selectedSlot: 2 });
});

test("Backspace moves the highlight to the character it removed", () => {
  let entry = createInitialsEntry();
  entry = updateInitialsEntry(entry, { ...idle, keyPresses: ["R", "O", "D"] });
  entry = updateInitialsEntry(entry, { ...idle, keyPresses: ["Backspace"] });
  assert.deepEqual(entry, { characters: ["R", "O", ""], selectedSlot: 2 });

  entry = updateInitialsEntry(entry, { ...idle, keyPresses: ["Backspace"] });
  assert.deepEqual(entry, { characters: ["R", "", ""], selectedSlot: 1 });
});

test("gamepad slot movement and character cycling update the highlighted field", () => {
  let entry = createInitialsEntry();
  entry = updateInitialsEntry(entry, { ...idle, slotDelta: 1, charDelta: -1 });
  assert.deepEqual(entry, { characters: ["", "A", ""], selectedSlot: 1 });
});


test("initials apply ordered same-frame edits and Enter ends the editing session", () => {
  const editor = new InitialsEditor();
  assert.equal(editor.keyDown("KeyA", "a", false), false);
  editor.keyUp("KeyA", "a");
  editor.keyDown("KeyA", "a", false);
  editor.keyDown("Backspace", "Backspace", false);
  assert.equal(editor.keyDown("Enter", "Enter", false), true);
  assert.equal(editor.keyDown("KeyZ", "z", false), false);
  assert.equal(editor.keyDown("Enter", "Enter", true), false);
  editor.touchSlot(2);
  assert.equal(editor.poll(1, -1, true), false);
  assert.deepEqual(editor.entry, { characters: ["A", "", ""], selectedSlot: 1 });
});

test("letters and Backspace repeat while typing, and the key value reflects the layout", () => {
  const editor = new InitialsEditor();
  editor.keyDown("KeyW", "z", true);
  assert.equal(editor.entry.characters.join(""), "");
  editor.keyDown("KeyW", "z", false);
  editor.keyDown("KeyW", "z", true);
  editor.keyDown("KeyA", "q", false);
  assert.equal(editor.entry.characters.join(""), "ZZQ");
  editor.keyDown("Backspace", "Backspace", false);
  editor.keyDown("Backspace", "Backspace", true);
  assert.equal(editor.entry.characters.join(""), "Z");
});

test("direct touch and keyboard edits apply in delivery order before sampled edits and Start", () => {
  const editor = new InitialsEditor();
  editor.touchSlot(2);
  editor.keyDown("KeyA", "a", false);
  assert.deepEqual(editor.entry.characters, ["A", "", "Z"]);
  editor.keyDown("Backspace", "Backspace", false);
  assert.deepEqual(editor.entry, { characters: ["A", "", ""], selectedSlot: 2 });
  editor.touchSlot(0);
  assert.equal(editor.poll(1, -1, true), true);
  assert.deepEqual(editor.entry, { characters: ["", "A", ""], selectedSlot: 1 });

  const touchSubmit = new InitialsEditor();
  touchSubmit.keyDown("KeyA", "a", false);
  touchSubmit.touchSlot(1);
  assert.equal(touchSubmit.submit(), true);
  assert.equal(touchSubmit.poll(1, -1, true), false);
  assert.deepEqual(touchSubmit.entry.characters, ["A", "Z", ""]);
});
