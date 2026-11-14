import test from "node:test";
import assert from "node:assert/strict";
import {
  createAudioController,
  isAudioPreferences,
  readAudioPreferences,
  writeAudioPreferences,
} from "./audio.ts";

const storageKey = "one-more-glow-very-angry-robots-audio-preferences";
const defaults = { enabled: true, volume: 1 };

function storageWith(initial = null) {
  const data = new Map(initial === null ? [] : [[storageKey, initial]]);
  return {
    data,
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, value); },
  };
}

function audioHarness({ throwOnCreate = false, throwOnPlay = false } = {}) {
  const audios = [];
  function createAudio(source) {
    if (throwOnCreate) throw new Error("Audio is unavailable");
    const audio = {
      src: source,
      volume: 1,
      preload: "",
      paused: false,
      playCount: 0,
      onended: null,
      onerror: null,
      play() {
        if (throwOnPlay) throw new Error("Playback blocked");
        this.playCount += 1;
        this.paused = false;
        return Promise.resolve();
      },
      pause() { this.paused = true; },
      removeAttribute(name) { if (name === "src") this.src = ""; },
      load() {},
      finish() { this.onended?.(); },
    };
    audios.push(audio);
    return audio;
  }
  return { audios, createAudio };
}

function makeController({ store = storageWith(), random = () => 0, now = () => 0, ...audioOptions } = {}) {
  const harness = audioHarness(audioOptions);
  const controller = createAudioController({
    getStorage: () => store,
    createAudio: harness.createAudio,
    random,
    now,
  });
  return { controller, harness, store };
}

test("audio preferences validate, default safely, persist under their own key, and survive storage failures", () => {
  assert.equal(isAudioPreferences(defaults), true);
  for (const invalid of [null, {}, { enabled: 1, volume: 1 }, { enabled: true, volume: -0.01 },
    { enabled: true, volume: 1.01 }, { enabled: true, volume: Number.NaN }]) {
    assert.equal(isAudioPreferences(invalid), false);
  }

  const store = storageWith();
  assert.deepEqual(readAudioPreferences(() => store), defaults);
  const selected = { enabled: false, volume: 0.4 };
  writeAudioPreferences(() => store, selected);
  assert.deepEqual(JSON.parse(store.data.get(storageKey)), selected);
  assert.equal(store.data.size, 1);
  assert.deepEqual(readAudioPreferences(() => storageWith("{")), defaults);
  assert.deepEqual(readAudioPreferences(() => storageWith(JSON.stringify({ enabled: true, volume: 2 }))), defaults);
  assert.deepEqual(readAudioPreferences(() => { throw new Error("blocked"); }), defaults);
  assert.doesNotThrow(() => writeAudioPreferences(() => { throw new Error("blocked"); }, selected));
  assert.doesNotThrow(() => writeAudioPreferences(() => ({ setItem() { throw new Error("quota"); } }), selected));
});

test("effect playback waits for gesture unlock and uses the stored master volume", () => {
  const { controller, harness } = makeController({ store: storageWith(JSON.stringify({ enabled: true, volume: 0.5 })) });
  controller.setGameplayState(true, false);
  controller.playEffects(["robot-destroyed"]);
  assert.equal(harness.audios.length, 0);

  controller.unlock();
  controller.playEffects(["robot-destroyed"]);
  assert.equal(harness.audios.length, 1);
  assert.equal(harness.audios[0].src, "/audio/hit01.ogg");
  assert.equal(harness.audios[0].volume, 0.275);
  controller.dispose();
});

test("changing preferences applies mute and volume immediately and persists the valid selection", () => {
  const store = storageWith();
  const { controller, harness } = makeController({ store });
  controller.unlock();
  controller.setGameplayState(true, false);
  controller.playEffects(["robot-destroyed"]);
  const first = harness.audios[0];

  controller.setPreferences({ enabled: false, volume: 1 });
  assert.equal(first.paused, true);
  assert.equal(harness.audios[0].src, "");
  assert.deepEqual(JSON.parse(store.data.get(storageKey)), { enabled: false, volume: 1 });
  controller.playEffects(["interface"]);
  assert.equal(harness.audios.length, 1);

  controller.setPreferences({ enabled: true, volume: 0.4 });
  controller.playEffects(["interface"]);
  assert.equal(harness.audios.length, 2);
  assert.ok(Math.abs(harness.audios[1].volume - 0.22) < 1e-12);
  controller.setPreferences({ enabled: true, volume: 2 });
  assert.deepEqual(controller.preferences, { enabled: true, volume: 0.4 });
  controller.dispose();
});

test("same-frame and rapid shot effects coalesce while later shots can retrigger", () => {
  let time = 1000;
  const { controller, harness } = makeController({ now: () => time });
  controller.unlock();
  controller.setGameplayState(true, false);

  controller.playEffects(["player-shot", "robot-shot", "player-shot"]);
  assert.equal(harness.audios.length, 1);
  assert.equal(harness.audios[0].src, "/audio/hit02.ogg");
  assert.equal(harness.audios[0].volume, 0.24);

  time += 89;
  controller.playEffects(["robot-shot"]);
  assert.equal(harness.audios.length, 1);
  time += 1;
  controller.playEffects(["robot-shot"]);
  assert.equal(harness.audios.length, 2);
  controller.dispose();
});

test("effects are capped and short interface effects can play outside gameplay", () => {
  const { controller, harness } = makeController();
  controller.unlock();
  controller.playEffects(["interface"]);
  assert.equal(harness.audios.length, 1);
  assert.equal(harness.audios[0].src, "/audio/bleep.ogg");

  controller.setGameplayState(true, false);
  controller.playEffects([
    "player-shot", "robot-destroyed", "room-cleared", "player-defeated", "player-hazard",
    "robot-hazard", "room-entered", "extra-life",
  ]);
  assert.equal(harness.audios.length, 9);
  assert.equal(harness.audios[0].paused, true);
  assert.ok(harness.audios.slice(1).every((audio) => !audio.paused));
  controller.dispose();
});

test("spoken clips are serialized and queued clips start after the current line ends", () => {
  const { controller, harness } = makeController();
  controller.unlock();
  controller.setGameplayState(true, false);
  controller.playVoice("captain-entry");
  controller.playVoice("retreat");

  assert.equal(harness.audios.length, 1);
  assert.equal(harness.audios[0].src, "/audio/captain_enter_room_speech.ogg");
  harness.audios[0].finish();
  assert.equal(harness.audios.length, 2);
  assert.equal(harness.audios[1].src, "/audio/exit_room_as_chicken_speech.ogg");
  controller.dispose();
});

test("taunts use the selected set and schedule a fresh irregular interval after each line", () => {
  const { controller, harness } = makeController();
  controller.unlock();
  controller.setGameplayState(true, false);
  controller.startTaunts("standard");
  controller.update(2.49);
  assert.equal(harness.audios.length, 0);
  controller.update(0.01);
  assert.equal(harness.audios[0].src, "/audio/standard_taunts/attack_it.ogg");

  harness.audios[0].finish();
  controller.update(2.49);
  assert.equal(harness.audios.length, 1);
  controller.update(0.01);
  assert.equal(harness.audios[1].src, "/audio/standard_taunts/attack_it.ogg");

  controller.stopTaunts();
  harness.audios[1].finish();
  controller.startTaunts("chicken");
  controller.update(2.5);
  assert.equal(harness.audios[2].src, "/audio/chicken_taunts/attack_the_chicken.ogg");
  controller.dispose();
});

test("a taunt due during a spoken line waits until the line ends, then uses a new delay", () => {
  const { controller, harness } = makeController();
  controller.unlock();
  controller.setGameplayState(true, false);
  controller.startTaunts("standard");
  controller.playVoice("captain-entry");
  controller.update(2.5);
  assert.equal(harness.audios.length, 1);

  harness.audios[0].finish();
  controller.update(2.49);
  assert.equal(harness.audios.length, 1);
  controller.update(0.01);
  assert.equal(harness.audios.length, 2);
  assert.match(harness.audios[1].src, /\/standard_taunts\//);
  controller.dispose();
});

test("pause stops active audio without replaying it on resume, and game exit stops taunts", () => {
  let time = 0;
  const { controller, harness } = makeController({ now: () => time });
  controller.unlock();
  controller.setGameplayState(true, false);
  controller.playEffects(["robot-destroyed"]);
  controller.startTaunts("standard");
  const effect = harness.audios[0];

  controller.setGameplayState(true, true);
  assert.equal(effect.paused, true);
  assert.equal(effect.src, "");
  controller.setGameplayState(true, false);
  controller.update(2.49);
  assert.equal(harness.audios.length, 1);
  time += 90;
  controller.playEffects(["robot-destroyed"]);
  assert.equal(harness.audios.length, 2);

  controller.setGameplayState(false, false);
  controller.update(15);
  assert.equal(harness.audios.length, 2);
  controller.dispose();
});

test("audio construction and playback failures do not escape into the game loop", () => {
  const { controller: unavailable, harness: unavailableHarness } = makeController({ throwOnCreate: true });
  unavailable.unlock();
  unavailable.setGameplayState(true, false);
  assert.doesNotThrow(() => unavailable.playEffects(["player-shot"]));
  unavailable.dispose();

  const { controller } = makeController({ throwOnPlay: true });
  controller.unlock();
  controller.setGameplayState(true, false);
  assert.doesNotThrow(() => controller.playEffects(["player-shot"]));
  controller.dispose();
  assert.equal(unavailableHarness.audios.length, 0);
});
