import assert from "node:assert/strict";
import test from "node:test";
import { backingSize, fitCanvasSize, genericMap, planBackingAllocation } from "../src/calibration-sizing.ts";

test("Robots fit respects the 1024 CSS pixel cap and 4:3 ratio", () => {
  assert.deepEqual(fitCanvasSize({ width: 1200, height: 900 }, 4 / 3, 1024), { width: 1024, height: 768 });
});

test("backing dimensions round fractional CSS dimensions independently", () => {
  assert.deepEqual(backingSize({ width: 100.4, height: 75.6 }, 1.5), { width: 151, height: 113 });
});

test("oversized calibration retains the original request and caps the allocation", () => {
  const allocation = planBackingAllocation({ width: 4096, height: 3072 }, 3);
  assert.deepEqual(allocation.requested, { width: 12288, height: 9216 });
  assert.ok(allocation.applied.width * allocation.applied.height <= 32_000_000);
  assert.ok(allocation.scale < 3);
  assert.match(allocation.limit ?? "", /allocation limits/);
});

test("a very tall canvas can hit the side limit without hitting the area limit", () => {
  const allocation = planBackingAllocation({ width: 64, height: 10000 }, 1);
  assert.deepEqual(allocation.applied, { width: 52, height: 8192 });
  assert.equal(allocation.limit, "8192 px side limit");
});

test("Letterbox preserves proportions and centers while Stretch uses both axes", () => {
  assert.deepEqual(genericMap({ width: 1600, height: 900 }, { width: 1024, height: 768 }, "letterbox"), {
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
