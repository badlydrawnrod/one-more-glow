import type { Color } from "one-more-glow";
import type { GameEvent, RobotColor } from "./game.ts";
import type { PresentedRoom } from "./score-flyups.ts";

/** Simulation facts that produce transient combat effects. */
export type ParticleEffectEvent = GameEvent;

export interface ParticleMark {
  /** Direction in radians, fixed when the event is added. */
  readonly angle: number;
  /** Maximum radial travel in room pixels. */
  readonly distance: number;
  /** Mark length in room pixels. */
  readonly length: number;
}

export interface ParticleBurst {
  readonly roomX: number;
  readonly roomY: number;
  readonly x: number;
  readonly y: number;
  /** Velocity inherited from the struck object, in room pixels per second. */
  readonly velocityX: number;
  readonly velocityY: number;
  readonly color: Color;
  readonly kind: "robot-destroyed" | "player-defeated" | "shot-impact";
  readonly marks: readonly ParticleMark[];
  /** Seconds since creation. */
  age: number;
}

export interface ParticleEffectState {
  readonly items: ParticleBurst[];
}

export const PARTICLE_EFFECT_LIFETIME = 0.42;

const ROBOT_COLORS: Record<RobotColor, Color> = {
  "dark yellow": [0.85, 0.65, 0.12],
  red: [1, 0.35, 0.36],
  "dark cyan": [0.12, 0.7, 0.7],
  green: [0.3, 0.95, 0.35],
  "dark purple": [0.65, 0.3, 0.85],
  "light yellow": [1, 0.95, 0.5],
  white: [1, 1, 1],
  "light purple": [0.85, 0.6, 1],
  grey: [0.7, 0.7, 0.7],
};

function makeMarks(count: number, distance: number, length: number, phase: number): ParticleMark[] {
  return Array.from({ length: count }, (_, index) => ({
    angle: phase + (Math.PI * 2 * index) / count,
    distance: distance * (index % 2 === 0 ? 1 : 0.78),
    length: length * (index % 3 === 0 ? 1.15 : 0.85),
  }));
}

function makeDirectionalMarks(count: number, distance: number, length: number, direction: number,
  spread: number): ParticleMark[] {
  return Array.from({ length: count }, (_, index) => ({
    angle: direction + ((index / Math.max(1, count - 1)) - 0.5) * spread,
    distance: distance * (index % 2 === 0 ? 1 : 0.78),
    length: length * (index % 3 === 0 ? 1.15 : 0.85),
  }));
}

function sparksAwayFromShot(velocityX: number, velocityY: number): number {
  return Math.atan2(-velocityY, -velocityX);
}

export function createParticleEffectState(): ParticleEffectState {
  return { items: [] };
}

/** Copies a simulation event into room-scoped transient presentation state. */
export function addParticleEffect(state: ParticleEffectState, event: ParticleEffectEvent): void {
  let kind: ParticleBurst["kind"];
  let color: Color;
  let marks: ParticleMark[];
  if (event.type === "robot-destroyed") {
    kind = event.type;
    color = ROBOT_COLORS[event.color];
    marks = makeMarks(10, 26, 7, 0.17);
  } else if (event.type === "player-defeated") {
    kind = event.type;
    color = [1, 0.96, 0.66];
    marks = makeMarks(12, 36, 8, 0.07);
  } else {
    kind = event.type;
    color = event.target === "wall" ? [0.75, 0.92, 1] : [1, 0.95, 0.77];
    marks = event.owner === "player"
      ? makeDirectionalMarks(6, 15, 4, sparksAwayFromShot(event.velocityX, event.velocityY), Math.PI / 2)
      : makeMarks(5, 9, 3, 0.31);
  }
  state.items.push({
    roomX: event.roomX,
    roomY: event.roomY,
    x: event.x,
    y: event.y,
    velocityX: event.type === "shot-impact" ? event.targetVelocityX : 0,
    velocityY: event.type === "shot-impact" ? event.targetVelocityY : 0,
    color,
    kind,
    marks,
    age: 0,
  });
}

/** Advances and expires effects. Reduced motion keeps each flash at its origin. */
export function updateParticleEffects(state: ParticleEffectState, deltaSeconds: number, reducedMotion = false): void {
  const delta = Math.max(0, deltaSeconds);
  for (const item of state.items) item.age += delta;
  for (let index = state.items.length - 1; index >= 0; index -= 1) {
    if (state.items[index].age >= PARTICLE_EFFECT_LIFETIME) state.items.splice(index, 1);
  }
  // The flag is accepted here so callers can use the same update contract as
  // other presentation modules; marks are positioned by particleMarkOffset.
  void reducedMotion;
}

/** Returns a mark's spread offset in room pixels; reduced motion yields a flash. */
export function particleMarkOffset(mark: ParticleMark, burst: ParticleBurst, reducedMotion = false): { x: number; y: number } {
  const progress = reducedMotion ? 0 : Math.max(0, Math.min(1, burst.age / PARTICLE_EFFECT_LIFETIME));
  return {
    x: (reducedMotion ? 0 : burst.velocityX * burst.age) + Math.cos(mark.angle) * mark.distance * progress,
    y: (reducedMotion ? 0 : burst.velocityY * burst.age) + Math.sin(mark.angle) * mark.distance * progress,
  };
}

/** Holds full brightness briefly, then fades the burst. */
export function particleEffectOpacity(burst: ParticleBurst): number {
  const fadeStart = PARTICLE_EFFECT_LIFETIME * 0.32;
  return Math.max(0, Math.min(1, (PARTICLE_EFFECT_LIFETIME - burst.age) / (PARTICLE_EFFECT_LIFETIME - fadeStart)));
}

export function clearParticleEffects(state: ParticleEffectState): void {
  state.items.length = 0;
}

/** Drops effects for rooms that are no longer presented. */
export function retainPresentedRoomParticleEffects(state: ParticleEffectState, rooms: readonly PresentedRoom[]): void {
  const roomKeys = new Set(rooms.map(({ roomX, roomY }) => `${roomX},${roomY}`));
  for (let index = state.items.length - 1; index >= 0; index -= 1) {
    const item = state.items[index];
    if (!roomKeys.has(`${item.roomX},${item.roomY}`)) state.items.splice(index, 1);
  }
}
