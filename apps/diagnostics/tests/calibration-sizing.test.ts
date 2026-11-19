import assert from "node:assert/strict";
import test from "node:test";
import { backingSize, fitCanvasSize, genericMap } from "../src/calibration-sizing.ts";

test("Robots fit respects the 1024 CSS pixel cap and 4:3 ratio", () => {
  assert.deepEqual(fitCanvasSize({ width: 1200, height: 900 }, 4 / 3, 1024), { width: 1024, height: 768 });
});

test("backing dimensions round fractional CSS dimensions independently", () => {
  assert.deepEqual(backingSize({ width: 100.4, height: 75.6 }, 1.5), { width: 151, height: 113 });
});

test("Generic Fit preserves proportions and centers while Stretch uses both axes", () => {
  assert.deepEqual(genericMap({ width: 1600, height: 900 }, { width: 1024, height: 768 }, "fit"), {
    scaleX: 1.171875,
    scaleY: 1.171875,
    offsetX: 200,
    offsetY: 0,
  });
  assert.deepEqual(genericMap({ width: 1600, height: 900 }, { width: 1024, height: 768 }, "stretch"), {
    scaleX: 1.5625,
    scaleY: 1.171875,
    offsetX: 0,
    offsetY: 0,
  });
});
