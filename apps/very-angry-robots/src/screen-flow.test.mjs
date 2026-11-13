import test from "node:test";
import assert from "node:assert/strict";
import { ATTRACT_SCREEN_DURATION_MS, createScreenFlow, updateScreenFlow } from "./screen-flow.ts";

const dispatch = (flow, action) => updateScreenFlow(flow, action);

test("starts on Main Menu and starts a fresh run from either attract screen", () => {
  const initial = createScreenFlow();
  assert.equal(initial.screen, "main-menu");
  const playing = dispatch(initial, { type: "start-run" });
  assert.equal(playing.screen, "playing");

  const topScores = dispatch(initial, { type: "advance" });
  assert.equal(topScores.screen, "top-scores");
  assert.equal(dispatch(topScores, { type: "start-run" }).screen, "playing");
});

test("qualifying game over waits on initials and retains the score through submission", () => {
  const playing = dispatch(createScreenFlow(), { type: "start-run" });
  const initials = dispatch(playing, { type: "run-ended", score: 12_345, qualifies: true });
  assert.deepEqual(initials, {
    screen: "initials", elapsedMs: 0, runScore: 12_345, submittedInitials: null,
  });
  assert.equal(dispatch(initials, { type: "tick", elapsedMs: ATTRACT_SCREEN_DURATION_MS }).screen, "initials");

  const topScores = dispatch(initials, { type: "initials-submitted", initials: "ACE" });
  assert.equal(topScores.screen, "top-scores");
  assert.equal(topScores.runScore, 12_345);
  assert.equal(topScores.submittedInitials, "ACE");
  assert.equal(topScores.elapsedMs, 0);
});

test("nonqualifying game over goes directly to Top Scores", () => {
  const playing = dispatch(createScreenFlow(), { type: "start-run" });
  const topScores = dispatch(playing, { type: "run-ended", score: 42, qualifies: false });
  assert.equal(topScores.screen, "top-scores");
  assert.equal(topScores.runScore, 42);
  assert.equal(topScores.submittedInitials, null);
});

test("attract screens alternate on 30 second intervals and preserve timer remainder", () => {
  let flow = dispatch(createScreenFlow(), { type: "tick", elapsedMs: 29_999 });
  assert.equal(flow.screen, "main-menu");
  assert.equal(flow.elapsedMs, 29_999);

  flow = dispatch(flow, { type: "tick", elapsedMs: 2 });
  assert.equal(flow.screen, "top-scores");
  assert.equal(flow.elapsedMs, 1);

  flow = dispatch(flow, { type: "tick", elapsedMs: ATTRACT_SCREEN_DURATION_MS * 2 });
  assert.equal(flow.screen, "top-scores");
  assert.equal(flow.elapsedMs, 1);
});

test("immediate screen advance toggles attract screens and resets the timer", () => {
  let flow = dispatch(createScreenFlow(), { type: "tick", elapsedMs: 8_000 });
  flow = dispatch(flow, { type: "advance" });
  assert.equal(flow.screen, "top-scores");
  assert.equal(flow.elapsedMs, 0);
  flow = dispatch(flow, { type: "advance" });
  assert.equal(flow.screen, "main-menu");
  assert.equal(flow.elapsedMs, 0);
});

test("starting a new run clears data retained from the prior run", () => {
  let flow = dispatch(createScreenFlow(), { type: "start-run" });
  flow = dispatch(flow, { type: "run-ended", score: 900, qualifies: true });
  flow = dispatch(flow, { type: "initials-submitted", initials: "BOT" });
  flow = dispatch(flow, { type: "start-run" });
  assert.deepEqual(flow, { screen: "playing", elapsedMs: 0, runScore: null, submittedInitials: null });
});
