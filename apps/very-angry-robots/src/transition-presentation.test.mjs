import test from "node:test";
import assert from "node:assert/strict";
import { transitionOffsets } from "./transition-presentation.ts";

const expected = {
  right: { start: [[0, 0], [1000, 0]], end: [[-1000, 0], [0, 0]] },
  left: { start: [[0, 0], [-1000, 0]], end: [[1000, 0], [0, 0]] },
  down: { start: [[0, 0], [0, -600]], end: [[0, 600], [0, 0]] },
  up: { start: [[0, 0], [0, 600]], end: [[0, -600], [0, 0]] },
};

for (const [direction, positions] of Object.entries(expected)) {
  test(`${direction} transition offsets start and finish at the adjoining rooms`, () => {
    const start = transitionOffsets(direction, 0);
    const end = transitionOffsets(direction, 1);
    assert.deepEqual([[start.from.x, start.from.y], [start.to.x, start.to.y]], positions.start);
    assert.deepEqual([[end.from.x, end.from.y], [end.to.x, end.to.y]], positions.end);
  });
}
