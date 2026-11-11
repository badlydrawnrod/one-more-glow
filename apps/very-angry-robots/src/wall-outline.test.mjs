import test from "node:test";
import assert from "node:assert/strict";
import { wallOutline } from "./wall-outline.ts";

test("touching and overlapping walls have a continuous outline with no internal joins", () => {
  assert.deepEqual(wallOutline([
    { x: 0, y: 0, width: 20, height: 4 },
    { x: 20, y: 0, width: 10, height: 4 },
    { x: 8, y: 2, width: 4, height: 10 },
  ]), [
    [0, 0, 30, 0], [0, 4, 8, 4], [12, 4, 30, 4], [8, 12, 12, 12],
    [0, 0, 0, 4], [8, 4, 8, 12], [12, 4, 12, 12], [30, 0, 30, 4],
  ]);
});
