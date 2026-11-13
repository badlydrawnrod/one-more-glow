import test from "node:test";
import assert from "node:assert/strict";
import { createInitialsEntry, updateInitialsEntry } from "./initials-entry.ts";

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
