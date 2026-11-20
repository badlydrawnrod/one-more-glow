import assert from "node:assert/strict";
import test from "node:test";
import { ASPECT_PRESETS, aspectDimensions, aspectRatio, backingSize, fitCanvasSize, genericMap, planBackingAllocation, swapDimensions } from "../src/calibration-sizing.ts";

test("aspect presets cover landscape, portrait, square, and custom dimensions", () => {
  const custom = { width: 1920, height: 1080 };
  assert.deepEqual(ASPECT_PRESETS, ["16:9", "16:10", "3:2", "4:3", "1:1"]);
  assert.equal(aspectRatio("16:9", "landscape", custom), 16 / 9);
  assert.equal(aspectRatio("16:9", "portrait", custom), 9 / 16);
  assert.equal(aspectRatio("16:10", "landscape", custom), 16 / 10);
  assert.equal(aspectRatio("3:2", "portrait", custom), 2 / 3);
  assert.equal(aspectRatio("1:1", "portrait", custom), 1);
  assert.deepEqual(aspectDimensions("16:9", "landscape", custom), { width: 1024, height: 576 });
  assert.deepEqual(aspectDimensions("16:9", "portrait", custom), { width: 576, height: 1024 });
  assert.deepEqual(aspectDimensions("1:1", "portrait", custom), { width: 1024, height: 1024 });
  assert.deepEqual(aspectDimensions("custom", "portrait", custom), custom);
  assert.deepEqual(swapDimensions(custom), { width: 1080, height: 1920 });
});

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
