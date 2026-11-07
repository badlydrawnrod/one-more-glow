import assert from "node:assert/strict";
import test from "node:test";
import {
  drawCircle,
  drawEllipse,
  drawPolygonOutline,
  drawPolyline,
  type DrawingContext,
  type Point,
} from "../src/index.ts";

type Call = ["moveTo" | "lineTo", number, number];

function recordingDrawing() {
  const calls: Call[] = [];
  const drawing: DrawingContext = {
    beginFrame() {},
    endFrame() {},
    setColor() {},
    setIntensity() {},
    moveTo: (x, y) => calls.push(["moveTo", x, y]),
    lineTo: (x, y) => calls.push(["lineTo", x, y]),
    point() {},
  };
  return { calls, drawing };
}

function expectedSegments(radius: number): number {
  return Math.max(12, Math.ceil(Math.PI / Math.acos(1 - 0.5 / radius)));
}

test("drawPolyline draws each segment without closing the path", () => {
  const { calls, drawing } = recordingDrawing();

  drawPolyline(drawing, [[1, 2], [3, 4], [5, 6]]);

  assert.deepEqual(calls, [
    ["moveTo", 1, 2],
    ["lineTo", 3, 4],
    ["lineTo", 5, 6],
  ]);
});

test("drawPolygonOutline closes the path and ignores undersized inputs", () => {
  const { calls, drawing } = recordingDrawing();
  const points: readonly Point[] = [[1, 2], [3, 4], [5, 6]];

  drawPolygonOutline(drawing, points);
  drawPolyline(drawing, [[1, 2]]);
  drawPolygonOutline(drawing, [[1, 2], [3, 4]]);

  assert.deepEqual(calls, [
    ["moveTo", 1, 2],
    ["lineTo", 3, 4],
    ["lineTo", 5, 6],
    ["lineTo", 1, 2],
  ]);
});

test("drawCircle emits a closed outline with radius-based tessellation", () => {
  const { calls, drawing } = recordingDrawing();

  drawCircle(drawing, [10, 20], 100);

  const segments = expectedSegments(100);
  assert.equal(calls.length, segments + 1);
  assert.deepEqual(calls[0], ["moveTo", 110, 20]);
  assert.equal(calls.at(-1)?.[0], "lineTo");
  assert.deepEqual(calls.at(-1)?.slice(1), [110, 20]);
});

test("drawEllipse uses its larger radius to choose the segment count", () => {
  const { calls, drawing } = recordingDrawing();

  drawEllipse(drawing, [4, -3], 80, 200);

  const segments = expectedSegments(200);
  assert.equal(calls.length, segments + 1);
  assert.deepEqual(calls[0], ["moveTo", 84, -3]);
  assert.deepEqual(calls.at(-1)?.slice(1), [84, -3]);
  assert.ok(calls.some(([, , y]) => y > 190));
});

test("small positive curves use at least twelve segments", () => {
  const { calls, drawing } = recordingDrawing();

  drawCircle(drawing, [0, 0], 0.1);

  assert.equal(calls.length, 13);
});

test("nonpositive radii produce no drawing operations", () => {
  const { calls, drawing } = recordingDrawing();

  drawCircle(drawing, [0, 0], 0);
  drawCircle(drawing, [0, 0], -2);
  drawEllipse(drawing, [0, 0], 5, 0);
  drawEllipse(drawing, [0, 0], -1, 5);

  assert.deepEqual(calls, []);
});
