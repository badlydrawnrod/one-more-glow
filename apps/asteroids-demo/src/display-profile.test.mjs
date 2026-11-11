import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_DISPLAY_PROFILE } from "one-more-glow";
import { ASTEROIDS_DEFAULT_DISPLAY_PROFILE, readDisplayProfile, writeDisplayProfile } from "./display-profile.ts";

function storage(initial = null) {
  let value = initial;
  return {
    getItem() { return value; },
    setItem(_key, next) { value = next; },
    value: () => value,
  };
}

test("display profile uses defaults when absent, malformed, invalid, or storage fails", () => {
  const defaults = { ...ASTEROIDS_DEFAULT_DISPLAY_PROFILE };
  assert.deepEqual(DEFAULT_DISPLAY_PROFILE, { lineWidth: 1.5, pointRadius: 1.5, glowStrength: 1, glowSpread: 1 });
  assert.deepEqual(readDisplayProfile(() => storage()), defaults);
  for (const raw of ["{", "{}", JSON.stringify({ ...defaults, glowSpread: 2.1 })]) {
    assert.deepEqual(readDisplayProfile(() => storage(raw)), defaults);
  }
  assert.deepEqual(readDisplayProfile(() => { throw new Error("blocked"); }), defaults);
  // A valid preference written by an older app version remains the user's choice.
  assert.deepEqual(readDisplayProfile(() => storage(JSON.stringify(DEFAULT_DISPLAY_PROFILE))), DEFAULT_DISPLAY_PROFILE);
});

test("display profile reads valid preferences as an independent value and persists updates", () => {
  const saved = { ...DEFAULT_DISPLAY_PROFILE, lineWidth: 3.2, glowStrength: 0 };
  const store = storage(JSON.stringify(saved));
  const loaded = readDisplayProfile(() => store);
  assert.deepEqual(loaded, saved);
  assert.notEqual(loaded, saved);
  const next = { ...loaded, pointRadius: 2.6 };
  writeDisplayProfile(() => store, next);
  assert.deepEqual(JSON.parse(store.value()), next);
  writeDisplayProfile(() => { throw new Error("blocked"); }, next);
});
