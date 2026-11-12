import { ROOM } from "./maze.ts";
import type { Direction } from "./game.ts";

export interface RoomOffset {
  x: number;
  y: number;
}

export interface TransitionOffsets {
  from: RoomOffset;
  to: RoomOffset;
}

/** Screen-space offsets for the outgoing and incoming rooms at transition progress. */
export function transitionOffsets(direction: Direction, progress: number): TransitionOffsets {
  const horizontal = direction === "left" || direction === "right";
  const distance = horizontal ? ROOM.width : ROOM.height;
  const screenTravel = direction === "right" ? 1 : direction === "left" ? -1
    : direction === "down" ? -1 : 1;
  const from = progress === 0 ? 0 : -screenTravel * distance * progress;
  const to = progress === 1 ? 0 : screenTravel * distance * (1 - progress);
  return horizontal
    ? { from: { x: from, y: 0 }, to: { x: to, y: 0 } }
    : { from: { x: 0, y: from }, to: { x: 0, y: to } };
}
