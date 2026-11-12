/* Copyright 2011 Rod Hyde. Licensed under the Apache License, Version 2.0.
 * https://www.apache.org/licenses/LICENSE-2.0 */
import type { Wall } from "./game.ts";

/**
 * Recursive-division room layout adapted from Very Angry Robots by Rod Hyde.
 * The original Java MazeGenerator and RoomBuilder are Apache-2.0 licensed.
 * This adaptation uses the game's 5×3 grid in a 1000×600 pixel room, keeps
 * walls thin and electrified, and omits perimeter walls (room edges are handled
 * by the game simulation). Door generation remains deferred.
 */
export const MAZE_GRID = { columns: 5, rows: 3 } as const;

export interface MazeLayout {
  walls: Wall[];
  /** Centers of the 5×3 grid cells, useful for placing entities safely. */
  cellCenters: { x: number; y: number }[];
}

export const ROOM = { width: 1000, height: 600 } as const;
export const WALL_THICKNESS = 8;

/** Builds the original recursive-division maze for the app's enclosed room. */
export function createMaze(random: () => number = Math.random): MazeLayout {
  const horizontalSegments: { x1: number; x2: number; y: number }[] = [];
  const verticalSegments: { x: number; y1: number; y2: number }[] = [];
  const randomInt = (min: number, max: number): number => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("Maze random source must return a number in [0, 1)");
    }
    return min + Math.floor(value * (max - min + 1));
  };

  const addHorizontal = (x1: number, x2: number, y: number, solid: boolean): void => {
    const length = x2 - x1;
    if (length < 2) return;
    if (solid) {
      horizontalSegments.push({ x1, x2, y });
    } else {
      const gap = randomInt(x1, x2 - 1);
      if (gap > x1) horizontalSegments.push({ x1, x2: gap, y });
      if (gap + 1 < x2) horizontalSegments.push({ x1: gap + 1, x2, y });
    }
  };
  const addVertical = (x: number, y1: number, y2: number, solid: boolean): void => {
    const length = y2 - y1;
    if (length < 2) return;
    if (solid) {
      verticalSegments.push({ x, y1, y2 });
    } else {
      const gap = randomInt(y1, y2 - 1);
      if (gap > y1) verticalSegments.push({ x, y1, y2: gap });
      if (gap + 1 < y2) verticalSegments.push({ x, y1: gap + 1, y2 });
    }
  };

  const divide = (x1: number, y1: number, x2: number, y2: number): void => {
    if (x2 - x1 < 2 || y2 - y1 < 2) return;
    const cx = randomInt(x1 + 1, x2 - 1);
    const cy = randomInt(y1 + 1, y2 - 1);
    const solid = randomInt(0, 3);
    addHorizontal(x1, cx, cy, solid === 0);
    addHorizontal(cx, x2, cy, solid === 1);
    addVertical(cx, y1, cy, solid === 2);
    addVertical(cx, cy, y2, solid === 3);
    divide(x1, y1, cx, cy);
    divide(cx, y1, x2, cy);
    divide(x1, cy, cx, y2);
    divide(cx, cy, x2, y2);
  };

  // Match MazeGenerator.subdivideChamber(0, 0, width, height). Its perimeter
  // wall definitions and doors are intentionally omitted in this room slice.
  divide(0, 0, MAZE_GRID.columns, MAZE_GRID.rows);

  const cellWidth = ROOM.width / MAZE_GRID.columns;
  const cellHeight = ROOM.height / MAZE_GRID.rows;
  const walls: Wall[] = [
    ...horizontalSegments.map(({ x1, x2, y }) => ({
      x: x1 * cellWidth - WALL_THICKNESS / 2,
      y: y * cellHeight - WALL_THICKNESS / 2,
      width: (x2 - x1) * cellWidth + WALL_THICKNESS,
      height: WALL_THICKNESS,
      electrified: true,
    })),
    ...verticalSegments.map(({ x, y1, y2 }) => ({
      x: x * cellWidth - WALL_THICKNESS / 2,
      y: y1 * cellHeight - WALL_THICKNESS / 2,
      width: WALL_THICKNESS,
      height: (y2 - y1) * cellHeight + WALL_THICKNESS,
      electrified: true,
    })),
  ];
  const cellCenters = Array.from({ length: MAZE_GRID.rows }, (_, row) =>
    Array.from({ length: MAZE_GRID.columns }, (_, column) => ({
      x: (column + 0.5) * cellWidth,
      y: (row + 0.5) * cellHeight,
    }))).flat();

  return { walls, cellCenters };
}
