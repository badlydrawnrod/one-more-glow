import test from "node:test";
import assert from "node:assert/strict";
import { clippedDrawing, intersectClipBounds } from "./clipped-drawing.ts";

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

test("intersects a room clip with the fixed scene clip as rooms scroll on every side", () => {
  const scene = { left: -504, right: 504, bottom: -364, top: 244 };
  const room = (x, y) => ({ left: x - 500, right: x + 500, bottom: y - 300, top: y + 300 });
  assert.deepEqual(intersectClipBounds(scene, room(-600, 0)),
    { left: -504, right: -100, bottom: -300, top: 244 });
  assert.deepEqual(intersectClipBounds(scene, room(600, 0)),
    { left: 100, right: 504, bottom: -300, top: 244 });
  assert.deepEqual(intersectClipBounds(scene, room(0, 400)),
    { left: -500, right: 500, bottom: 100, top: 244 });
  assert.deepEqual(intersectClipBounds(scene, room(0, -400)),
    { left: -500, right: 500, bottom: -364, top: -100 });
  assert.equal(intersectClipBounds(scene, room(0, 1000)), undefined);
});

test("clips partially entering geometry to the translated room and scene intersection", () => {
  const target = recordingContext();
  const bounds = intersectClipBounds(
    { left: -504, right: 504, bottom: -364, top: 244 },
    { left: -110, right: 890, bottom: -300, top: 300 },
  );
  assert.ok(bounds);
  const clipped = clippedDrawing(target, bounds);
  clipped.moveTo(-150, 0);
  clipped.lineTo(-50, 0);
  assert.deepEqual(target.calls, [["moveTo", -110, 0], ["lineTo", -50, 0]]);
});
