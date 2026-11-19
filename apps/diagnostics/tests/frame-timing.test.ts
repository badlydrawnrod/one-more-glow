import assert from "node:assert/strict";
import test from "node:test";
import { hasEnoughFrameSample, summarizeFrameIntervals } from "../src/frame-timing.ts";

test("frame timing waits for both the duration and interval thresholds", () => {
  assert.equal(hasEnoughFrameSample(2000, 30), true);
  assert.equal(hasEnoughFrameSample(1999, 100), false);
  assert.equal(hasEnoughFrameSample(4000, 29), false);
});

test("frame timing uses mean FPS, median, and nearest-rank p95", () => {
  const summary = summarizeFrameIntervals([30, 10, 20, 40], 2100);
  assert.deepEqual(summary, { fps: 40, median: 25, p95: 40, duration: 2100, count: 4 });
  assert.equal(summarizeFrameIntervals([16, Number.NaN], 2100), null);
});
