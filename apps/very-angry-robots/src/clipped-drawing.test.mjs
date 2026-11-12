import test from "node:test";
import assert from "node:assert/strict";
import { clippedDrawing } from "./clipped-drawing.ts";

function recordingContext() {
  const calls = [];
  return {
    calls,
    beginFrame() {}, endFrame() {}, setColor() {}, setIntensity() {},
    pushTransform() {}, popTransform() {}, translate() {}, rotate() {}, scale() {},
    moveTo(x, y) { calls.push(["moveTo", x, y]); },
    lineTo(x, y) { calls.push(["lineTo", x, y]); },
    point(x, y) { calls.push(["point", x, y]); },
  };
}

test("clips transformed line segments to the view bounds", () => {
  const target = recordingContext();
  const clipped = clippedDrawing(target, { left: -5, right: 5, bottom: -4, top: 4 });
  clipped.translate(10, 0);
  clipped.moveTo(-20, 0);
  clipped.lineTo(0, 0);
  assert.deepEqual(target.calls, [["moveTo", -5, 0], ["lineTo", 5, 0]]);
});

test("drops points outside the view bounds after scaling", () => {
  const target = recordingContext();
  const clipped = clippedDrawing(target, { left: -5, right: 5, bottom: -4, top: 4 });
  clipped.scale(2, 2);
  clipped.point(2, 1);
  clipped.point(3, 0);
  assert.deepEqual(target.calls, [["point", 4, 2]]);
});
