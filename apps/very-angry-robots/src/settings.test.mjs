import test from "node:test";
import assert from "node:assert/strict";
import { ROBOTS_DEFAULT_DISPLAY_PROFILE } from "./display-profile.ts";
import { createSettings } from "./settings.ts";

function createHarness({ displayProfile = ROBOTS_DEFAULT_DISPLAY_PROFILE, audioPreferences = { enabled: true, volume: 1 } } = {}) {
  const appliedProfiles = [];
  const preferenceUpdates = [];
  const playedEffects = [];
  const drawing = new Proxy({}, { get: () => () => {} });
  const settings = createSettings({
    drawing,
    displayProfile,
    audioPreferences,
    resetDisplayProfile: ROBOTS_DEFAULT_DISPLAY_PROFILE,
    applyDisplayProfile(profile) { appliedProfiles.push({ ...profile }); },
    audio: {
      setPreferences(preferences) { preferenceUpdates.push({ ...preferences }); },
      playEffects(effects) { playedEffects.push([...effects]); },
    },
  });
  return { settings, appliedProfiles, preferenceUpdates, playedEffects };
}

test("settings start on line width and apply bounded tenth-step adjustments", () => {
  const { settings, appliedProfiles } = createHarness();

  settings.moveSelection(3);
  settings.open();
  settings.adjustSelection(1);
  assert.equal(settings.displayProfile.lineWidth, 1.1);
  assert.equal(appliedProfiles.length, 1);

  settings.adjustSelection(-1);
  assert.equal(settings.displayProfile.lineWidth, 1.0);
  for (let index = 0; index < 40; index += 1) settings.adjustSelection(-1);
  assert.equal(settings.displayProfile.lineWidth, 0.5);
});

test("selection wraps across all controls and activates sound, reset, and close", () => {
  const { settings, appliedProfiles } = createHarness({
    displayProfile: { lineWidth: 2, pointRadius: 3, glowStrength: 1, glowSpread: 1.5 },
  });

  settings.moveSelection(-1);
  settings.moveSelection(1);
  settings.moveSelection(4);
  settings.activateSelection();
  assert.deepEqual(settings.audioPreferences, { enabled: false, volume: 1 });

  settings.moveSelection(2);
  settings.activateSelection();
  assert.deepEqual(settings.displayProfile, ROBOTS_DEFAULT_DISPLAY_PROFILE);
  assert.deepEqual(settings.audioPreferences, { enabled: false, volume: 1 });
  assert.deepEqual(appliedProfiles.at(-1), ROBOTS_DEFAULT_DISPLAY_PROFILE);

  settings.moveSelection(1);
  assert.equal(settings.activateSelection(), "close");
});

test("pointer slider selection clamps and snaps values to tenths", () => {
  const { settings } = createHarness();

  settings.pointer([-420, 176]);
  assert.equal(settings.displayProfile.lineWidth, 0.5);
  settings.pointer([24, 176]);
  assert.equal(settings.displayProfile.lineWidth, 4);
});

test("pointer sound row toggles only on activation and volume slider updates preferences", () => {
  const { settings, preferenceUpdates } = createHarness();

  settings.pointer([-420, -115], false);
  assert.equal(settings.audioPreferences.enabled, true);
  settings.pointer([-420, -115]);
  assert.equal(settings.audioPreferences.enabled, false);

  settings.pointer([-198, -212]);
  assert.equal(settings.audioPreferences.volume, 0.5);
  assert.deepEqual(preferenceUpdates.at(-1), { enabled: false, volume: 0.5 });
});

test("pointer reset restores display defaults and close reports a lifecycle request", () => {
  const { settings, appliedProfiles } = createHarness({
    displayProfile: { lineWidth: 2, pointRadius: 3, glowStrength: 1, glowSpread: 1.5 },
  });

  assert.equal(settings.pointer([-50, -280]), undefined);
  assert.deepEqual(settings.displayProfile, ROBOTS_DEFAULT_DISPLAY_PROFILE);
  assert.deepEqual(appliedProfiles.at(-1), ROBOTS_DEFAULT_DISPLAY_PROFILE);
  assert.equal(settings.pointer([50, -280]), "close");
});
