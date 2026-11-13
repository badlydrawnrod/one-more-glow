import type { RobotColor } from "./game.ts";

/** A scoring event emitted by the simulation when a robot is destroyed. */
export interface RobotDestroyedFlyupEvent {
  type: "robot-destroyed";
  roomX: number;
  roomY: number;
  x: number;
  y: number;
  color: RobotColor;
  points: number;
}

export interface ScoreFlyup {
  readonly roomX: number;
  readonly roomY: number;
  readonly x: number;
  readonly y: number;
  readonly color: RobotColor;
  readonly points: number;
  /** Seconds since creation. */
  age: number;
}

export interface ScoreFlyupState {
  readonly items: ScoreFlyup[];
}

export interface PresentedRoom {
  roomX: number;
  roomY: number;
}

export const SCORE_FLYUP_LIFETIME = 1.15;
/** Start labels slightly above the event center so they leave room for impact bursts. */
export const SCORE_FLYUP_START_OFFSET = 12;
export const SCORE_FLYUP_RISE_DISTANCE = 24;

export function createScoreFlyupState(): ScoreFlyupState {
  return { items: [] };
}

/** Copies a robot award into transient presentation state without changing game state. */
export function addScoreFlyup(state: ScoreFlyupState, event: RobotDestroyedFlyupEvent): void {
  if (event.type !== "robot-destroyed" || event.points <= 0) return;
  state.items.push({
    roomX: event.roomX,
    roomY: event.roomY,
    x: event.x,
    y: event.y,
    color: event.color,
    points: event.points,
    age: 0,
  });
}

/** Advances lifetime using seconds; reduced motion keeps each label stationary. */
export function updateScoreFlyups(state: ScoreFlyupState, deltaSeconds: number, _reducedMotion = false): void {
  const delta = Math.max(0, deltaSeconds);
  for (const flyup of state.items) flyup.age += delta;
  for (let index = state.items.length - 1; index >= 0; index -= 1) {
    if (state.items[index].age >= SCORE_FLYUP_LIFETIME) state.items.splice(index, 1);
  }
}

/** Returns the rise offset in room pixels, or zero for reduced-motion presentation. */
export function scoreFlyupRise(flyup: ScoreFlyup, reducedMotion = false): number {
  if (reducedMotion) return 0;
  const progress = Math.max(0, Math.min(1, flyup.age / SCORE_FLYUP_LIFETIME));
  return -SCORE_FLYUP_RISE_DISTANCE * progress;
}

/** Returns opacity with a brief legible hold followed by a smooth fade. */
export function scoreFlyupOpacity(flyup: ScoreFlyup): number {
  const fadeStart = SCORE_FLYUP_LIFETIME * 0.35;
  return Math.max(0, Math.min(1, (SCORE_FLYUP_LIFETIME - flyup.age) / (SCORE_FLYUP_LIFETIME - fadeStart)));
}

export function clearScoreFlyups(state: ScoreFlyupState): void {
  state.items.length = 0;
}

/** Drops labels whose source room is no longer among the rooms being presented. */
export function retainPresentedRoomFlyups(state: ScoreFlyupState, rooms: readonly PresentedRoom[]): void {
  const roomKeys = new Set(rooms.map(({ roomX, roomY }) => `${roomX},${roomY}`));
  for (let index = state.items.length - 1; index >= 0; index -= 1) {
    const flyup = state.items[index];
    if (!roomKeys.has(`${flyup.roomX},${flyup.roomY}`)) state.items.splice(index, 1);
  }
}
