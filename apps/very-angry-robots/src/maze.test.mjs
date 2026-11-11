import assert from "node:assert/strict";
import test from "node:test";
import { createMaze, MAZE_GRID } from "./maze.ts";

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function centersAreConnected(layout) {
  const width = MAZE_GRID.columns;
  const height = MAZE_GRID.rows;
  const index = (column, row) => row * width + column;
  const clearBetween = (a, b) => !layout.walls.some((wall) => {
    if (a.y === b.y) {
      const x = (a.x + b.x) / 2;
      return x >= wall.x && x <= wall.x + wall.width
        && a.y >= wall.y && a.y <= wall.y + wall.height;
    }
    const y = (a.y + b.y) / 2;
    return y >= wall.y && y <= wall.y + wall.height
      && a.x >= wall.x && a.x <= wall.x + wall.width;
  });

  const visited = new Set([0]);
  const queue = [0];
  while (queue.length > 0) {
    const current = queue.shift();
    const column = current % width;
    const row = Math.floor(current / width);
    for (const [nextColumn, nextRow] of [[column - 1, row], [column + 1, row], [column, row - 1], [column, row + 1]]) {
      if (nextColumn < 0 || nextColumn >= width || nextRow < 0 || nextRow >= height) continue;
      const next = index(nextColumn, nextRow);
      if (!visited.has(next) && clearBetween(layout.cellCenters[current], layout.cellCenters[next])) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited.size === width * height;
}

test("maze generation is reproducible with an injected random source", () => {
  const first = createMaze(seededRandom(41));
  const second = createMaze(seededRandom(41));
  assert.deepEqual(first, second);
  assert.ok(first.walls.length > 0);
});

test("division skips single-cell arms but keeps single-cell fragments beside a gap", () => {
  const { walls } = createMaze(() => 0);
  assert.deepEqual(walls, [
    { x: 316, y: 196, width: 488, height: 8, electrified: true },
    { x: 476, y: 396, width: 328, height: 8, electrified: true },
    { x: 156, y: 396, width: 8, height: 208, electrified: true },
  ]);
});

test("maze walls fit the room and leave clear, connected grid-cell spaces", () => {
  const layout = createMaze(seededRandom(2025));
  assert.equal(layout.cellCenters.length, MAZE_GRID.columns * MAZE_GRID.rows);
  assert.ok(layout.walls.every((wall) => wall.electrified
    && wall.width > 0 && wall.height > 0
    && wall.x >= -4 && wall.y >= -4
    && wall.x + wall.width <= 804 && wall.y + wall.height <= 604));
  assert.ok(layout.cellCenters.every(({ x, y }) => x > 14 && x < 786 && y > 14 && y < 586));
  for (const center of layout.cellCenters) {
    assert.ok(!layout.walls.some((wall) => center.x >= wall.x && center.x <= wall.x + wall.width
      && center.y >= wall.y && center.y <= wall.y + wall.height), "cell center is clear of walls");
  }
  for (let seed = 1; seed <= 100; seed += 1) {
    assert.ok(centersAreConnected(createMaze(seededRandom(seed))), `maze ${seed} has connected passages`);
  }
});

test("maze rejects invalid random source values", () => {
  assert.throws(() => createMaze(() => 1), RangeError);
});
