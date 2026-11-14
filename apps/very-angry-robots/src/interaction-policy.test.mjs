import test from "node:test";
import assert from "node:assert/strict";
import { createGame, updateGame } from "./game.ts";
import { canOpenDisplaySettings, focusLossOverlayState, shouldAdvanceGame, shouldAdvanceSceneTime, shouldTickAttractScreen } from "./interaction-policy.ts";
import { createScreenFlow, updateScreenFlow } from "./screen-flow.ts";

const idle = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, restartPressed: false };

test("pause and settings gates preserve active play state and resume from the same simulation state", () => {
  const game = createGame(() => 0.25);
  const initial = structuredClone(game);
  assert.equal(shouldAdvanceGame("playing", true, false), false);
  assert.equal(shouldAdvanceSceneTime("playing", true, false), false);
  if (shouldAdvanceGame("playing", true, false)) updateGame(game, 0.5, idle);
  assert.deepEqual(game, initial);

  assert.equal(shouldAdvanceGame("playing", false, true), false);
  if (shouldAdvanceGame("playing", false, true)) updateGame(game, 0.5, idle);
  assert.deepEqual(game, initial);

  assert.equal(shouldAdvanceGame("playing", false, false), true);
  updateGame(game, 0.1, idle);
  assert.notDeepEqual(game, initial);
});

test("the pause gate freezes room transition and death interval state", () => {
  const transitionGame = createGame(() => 0.25);
  transitionGame.transition = {
    direction: "right", progress: 0.4, duration: 1,
    from: structuredClone(transitionGame), to: structuredClone(transitionGame),
  };
  const transitionBefore = structuredClone(transitionGame);
  assert.equal(shouldAdvanceGame("playing", true, false), false);
  if (shouldAdvanceGame("playing", true, false)) updateGame(transitionGame, 0.5, idle);
  assert.deepEqual(transitionGame, transitionBefore);
  updateGame(transitionGame, 0.1, idle);
  assert.equal(transitionGame.transition.progress, 0.5);

  const dyingGame = createGame(() => 0.25);
  dyingGame.outcome = "dying";
  dyingGame.deathTimeRemaining = 1.25;
  const deathBefore = structuredClone(dyingGame);
  if (shouldAdvanceGame("playing", true, false)) updateGame(dyingGame, 0.5, idle);
  assert.deepEqual(dyingGame, deathBefore);
  updateGame(dyingGame, 0.1, idle);
  assert.ok(Math.abs(dyingGame.deathTimeRemaining - 1.15) < 1e-12);
});

test("settings access matches attract and paused screens, excluding gameplay and initials", () => {
  assert.equal(canOpenDisplaySettings("main-menu", false), true);
  assert.equal(canOpenDisplaySettings("top-scores", false), true);
  assert.equal(canOpenDisplaySettings("playing", true), true);
  assert.equal(canOpenDisplaySettings("playing", false), false);
  assert.equal(canOpenDisplaySettings("initials", false), false);
});

test("focus loss pauses a run and does not clear an existing pause", () => {
  assert.deepEqual(focusLossOverlayState("playing", false, false), { paused: true, settingsOpen: false });
  assert.deepEqual(focusLossOverlayState("playing", true, false), { paused: true, settingsOpen: false });
  assert.deepEqual(focusLossOverlayState("playing", true, true), { paused: true, settingsOpen: true });
  assert.deepEqual(focusLossOverlayState("main-menu", false, true), { paused: false, settingsOpen: true });
});

test("settings suspend the attract timer and closing resumes its exact remainder", () => {
  let flow = updateScreenFlow(createScreenFlow(), { type: "tick", elapsedMs: 12_345 });
  const origin = structuredClone(flow);
  assert.equal(shouldTickAttractScreen(flow.screen, true), false);
  if (shouldTickAttractScreen(flow.screen, true)) flow = updateScreenFlow(flow, { type: "tick", elapsedMs: 20_000 });
  assert.deepEqual(flow, origin);
  assert.equal(shouldTickAttractScreen(flow.screen, false), true);
  flow = updateScreenFlow(flow, { type: "tick", elapsedMs: 1 });
  assert.equal(flow.elapsedMs, 12_346);
});
