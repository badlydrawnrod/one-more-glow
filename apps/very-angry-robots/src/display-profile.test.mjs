import test from "node:test";
import assert from "node:assert/strict";
import { isDisplayProfile, readDisplayProfile, ROBOTS_DEFAULT_DISPLAY_PROFILE, writeDisplayProfile } from "./display-profile.ts";

const key = "one-more-glow-very-angry-robots-display-profile";
const valid = { lineWidth: 0.5, pointRadius: 4, glowStrength: 0, glowSpread: 2 };

function storageWith(value = null) {
  const data = new Map(value === null ? [] : [[key, value]]);
  return {
    data,
    getItem(name) { return data.get(name) ?? null; },
    setItem(name, contents) { data.set(name, contents); },
  };
}

test("accepts the shared display profile boundaries and rejects malformed or out-of-range values", () => {
  assert.equal(isDisplayProfile(valid), true);
  for (const bad of [null, [], {}, { ...valid, lineWidth: 0.49 }, { ...valid, pointRadius: 4.01 },
    { ...valid, glowStrength: -0.1 }, { ...valid, glowSpread: 2.1 }, { ...valid, glowStrength: NaN }]) {
    assert.equal(isDisplayProfile(bad), false);
  }
});

test("loads defaults when no profile exists and returns an independent value", () => {
  const profile = readDisplayProfile(() => storageWith());
  assert.deepEqual(profile, ROBOTS_DEFAULT_DISPLAY_PROFILE);
  profile.lineWidth = 4;
  assert.equal(ROBOTS_DEFAULT_DISPLAY_PROFILE.lineWidth, 1.0);
});

test("loads a valid saved profile and falls back to defaults for invalid or malformed data", () => {
  assert.deepEqual(readDisplayProfile(() => storageWith(JSON.stringify(valid))), valid);
  assert.deepEqual(readDisplayProfile(() => storageWith("{")), ROBOTS_DEFAULT_DISPLAY_PROFILE);
  assert.deepEqual(readDisplayProfile(() => storageWith(JSON.stringify({ ...valid, glowSpread: 3 }))), ROBOTS_DEFAULT_DISPLAY_PROFILE);
});

test("storage read and write failures are non-fatal and preserve session tuning", () => {
  assert.deepEqual(readDisplayProfile(() => { throw new Error("blocked"); }), ROBOTS_DEFAULT_DISPLAY_PROFILE);
  const profile = { ...valid };
  assert.doesNotThrow(() => writeDisplayProfile(() => { throw new Error("blocked"); }, profile));
});

test("writes the selected profile under the app-specific preference key", () => {
  const storage = storageWith();
  writeDisplayProfile(() => storage, valid);
  assert.deepEqual(JSON.parse(storage.data.get(key)), valid);
  assert.equal(storage.data.size, 1);
});
