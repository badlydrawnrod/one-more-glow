import assert from "node:assert/strict";
import test from "node:test";
import { gameAudioActions } from "./game-audio.ts";

const room = { roomX: 2, roomY: -1 };

test("resolved game events map to their presentation cues, while impacts stay silent", () => {
  const events = [
    { type: "player-shot", ...room },
    { type: "robot-shot", ...room },
    { type: "robot-destroyed", ...room, x: 1, y: 2, color: "red", points: 50 },
    { type: "room-cleared", ...room },
    { type: "player-defeated", ...room, x: 1, y: 2 },
    { type: "player-hazard", ...room },
    { type: "robot-hazard", ...room },
    { type: "room-entered", roomX: 3, roomY: -1 },
    { type: "captain-entered", roomX: 3, roomY: -1 },
    { type: "player-respawned", ...room },
    { type: "extra-life", ...room },
    { type: "shot-impact", ...room, x: 2, y: 3, owner: "player", velocityX: 4, velocityY: 0,
      targetVelocityX: 0, targetVelocityY: 0, target: "wall" },
  ];
  const actions = gameAudioActions(events);
  assert.deepEqual(actions.effects, ["player-shot", "robot-shot", "robot-destroyed", "room-cleared",
    "player-defeated", "player-hazard", "robot-hazard", "room-entered", "room-entered", "extra-life"]);
  assert.deepEqual(actions.voices, ["captain-entry"]);
  assert.equal(actions.stopTaunts, true);
});

test("retreat switches later taunts to chicken and queues retreat speech", () => {
  assert.deepEqual(gameAudioActions([{ type: "room-retreated", ...room }]), {
    effects: [], voices: ["retreat"], stopTaunts: true, tauntSet: "chicken",
  });
});
