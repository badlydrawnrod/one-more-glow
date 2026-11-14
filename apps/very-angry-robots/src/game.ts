import { createMaze, ROOM, WALL_THICKNESS } from "./maze.ts";
import { createRoomGeometry, DOOR_OPENING, type RoomSide } from "./room-geometry.ts";
export { ROOM } from "./maze.ts";

/** The simulation is expressed in room pixels and does not depend on rendering or input APIs. */

export type Outcome = "playing" | "dying" | "lost";
export type Direction = "left" | "right" | "up" | "down";

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
  electrified: boolean;
}

export interface Player {
  spawnX: number;
  spawnY: number;
  x: number;
  y: number;
  radius: number;
  fireCooldown: number;
}

export interface Robot {
  spawnX: number;
  spawnY: number;
  id: number;
  x: number;
  y: number;
  radius: number;
  moveSpeed: number;
  fireCooldown: number;
}

export interface Shot {
  id: number;
  owner: "player" | "robot";
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

export interface Captain {
  x: number;
  y: number;
  radius: number;
  state: "lurking" | "chasing";
  lurkTimeRemaining: number;
  bouncePhase: number;
}

export type RobotColor = "dark yellow" | "red" | "dark cyan" | "green" | "dark purple"
  | "light yellow" | "white" | "light purple" | "grey";

export interface Difficulty {
  threshold: number;
  color: RobotColor;
  shotLimit: number;
  shotSpeed: number;
}

export interface Game {
  lives: number;
  deathTimeRemaining: number;
  fireAmnestyRemaining: number;
  score: number;
  difficulty: Difficulty;
  roomEntryScore: number;
  roomPopulation: number;
  outcome: Outcome;
  player: Player;
  captain: Captain;
  robots: Robot[];
  shots: Shot[];
  walls: Wall[];
  nextId: number;
  elapsed: number;
  seed: number;
  roomX: number;
  roomY: number;
  entrance: Direction;
  geometry: ReturnType<typeof createRoomGeometry>;
  transition: RoomTransition | null;
}

/** A gameplay event for presentation systems to consume without changing simulation state. */
export interface RobotDestroyedEvent {
  type: "robot-destroyed";
  roomX: number;
  roomY: number;
  x: number;
  y: number;
  color: RobotColor;
  points: number;
}

export interface PlayerDefeatedEvent {
  type: "player-defeated";
  roomX: number;
  roomY: number;
  x: number;
  y: number;
}

export interface ShotImpactEvent {
  type: "shot-impact";
  roomX: number;
  roomY: number;
  x: number;
  y: number;
  owner: Shot["owner"];
  velocityX: number;
  velocityY: number;
  targetVelocityX: number;
  targetVelocityY: number;
  target: "wall" | "robot" | "player" | "captain";
}

export type GameEvent = RobotDestroyedEvent | PlayerDefeatedEvent | ShotImpactEvent;

export interface RoomSnapshot {
  difficulty: Difficulty;
  roomX: number;
  roomY: number;
  entrance: Direction;
  player: Player;
  captain: Captain;
  robots: Robot[];
  shots: Shot[];
  walls: Wall[];
  geometry: ReturnType<typeof createRoomGeometry>;
}

export interface RoomTransition {
  direction: Direction;
  progress: number;
  duration: number;
  from: RoomSnapshot;
  to: RoomSnapshot;
}

export interface InputFrame {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  fire: boolean;
  restartPressed: boolean;
}

const PLAYER_SPEED = 190;
const PLAYER_FIRE_INTERVAL = 0.32;
const PLAYER_SHOT_SPEED = 440;
const SLOW_SHOT_SPEED = 235;
const FAST_SHOT_SPEED = SLOW_SHOT_SPEED * 1.28;
const ROBOT_FIRE_INTERVAL = 1.15;
const DEATH_INTERVAL = 2;
const FIRE_AMNESTY = 2;
const SHOT_RADIUS = 4;
const CONTACT_RADIUS = 2;
const STEP = 1 / 120;
export const ROOM_SCROLL_DURATION = 0.45;
export const DOOR_CLOSE_DURATION = 0.35;

const ROBOT_RADIUS = 16;
const ROBOT_WALL_CLEARANCE = 24;
const CAPTAIN_RADIUS = 22;
const CAPTAIN_SPEED = PLAYER_SPEED * 0.5;
const CAPTAIN_BOUNCE_SPEED = 20;

const DIFFICULTIES: readonly Difficulty[] = [
  { threshold: 0, color: "dark yellow", shotLimit: 0, shotSpeed: SLOW_SHOT_SPEED },
  { threshold: 300, color: "red", shotLimit: 1, shotSpeed: SLOW_SHOT_SPEED },
  { threshold: 1000, color: "dark cyan", shotLimit: 2, shotSpeed: SLOW_SHOT_SPEED },
  { threshold: 2000, color: "green", shotLimit: 3, shotSpeed: SLOW_SHOT_SPEED },
  { threshold: 4000, color: "dark purple", shotLimit: 4, shotSpeed: SLOW_SHOT_SPEED },
  { threshold: 5000, color: "light yellow", shotLimit: 5, shotSpeed: SLOW_SHOT_SPEED },
  { threshold: 6000, color: "white", shotLimit: 1, shotSpeed: FAST_SHOT_SPEED },
  { threshold: 8000, color: "dark cyan", shotLimit: 2, shotSpeed: FAST_SHOT_SPEED },
  { threshold: 10000, color: "light purple", shotLimit: 3, shotSpeed: FAST_SHOT_SPEED },
  { threshold: 12500, color: "grey", shotLimit: 4, shotSpeed: FAST_SHOT_SPEED },
  { threshold: 15000, color: "dark yellow", shotLimit: 5, shotSpeed: FAST_SHOT_SPEED },
  { threshold: 20000, color: "red", shotLimit: 6, shotSpeed: FAST_SHOT_SPEED },
];

export function difficultyForScore(score: number): Difficulty {
  return DIFFICULTIES.findLast((tier) => score >= tier.threshold) ?? DIFFICULTIES[0];
}

const IDLE: InputFrame = {
  moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, restartPressed: false,
};

export function createGame(random: () => number = Math.random): Game {
  const seed = randomSeed(random);
  return createRoom(seed, 0, 0, "left", 0, 6);
}

function createRoom(seed: number, roomX: number, roomY: number, entrance: Direction,
  score: number, population: number): Game {
  const random = createRandom(roomSeed(seed, roomX, roomY));
  const maze = createMaze(random);
  const geometry = createRoomGeometry(directionSide(entrance));
  const walls = [...maze.walls, ...geometry.hazardRects];
  const playerCell = entryCell(entrance);
  const playerStart = { ...maze.cellCenters[playerCell] };
  if (entrance === "left") playerStart.x = 75;
  else if (entrance === "right") playerStart.x = ROOM.width - 75;
  else if (entrance === "up") playerStart.y = 75;
  else playerStart.y = ROOM.height - 75;
  const robotCells = chooseRobotCells(maze.cellCenters, playerStart, population, random, walls);
  return {
    lives: 3,
    deathTimeRemaining: 0,
    fireAmnestyRemaining: FIRE_AMNESTY,
    score,
    difficulty: difficultyForScore(score),
    roomEntryScore: score,
    roomPopulation: population,
    outcome: "playing",
    player: { ...playerStart, spawnX: playerStart.x, spawnY: playerStart.y, radius: 14, fireCooldown: 0 },
    captain: createCaptain(entrance, population),
    robots: robotCells.map((cell, index) => ({ ...maze.cellCenters[cell],
      spawnX: maze.cellCenters[cell].x, spawnY: maze.cellCenters[cell].y, id: index + 1,
      radius: ROBOT_RADIUS, moveSpeed: 78, fireCooldown: 0.4 + (index % 4) * 0.35 })),
    shots: [],
    walls,
    nextId: population + 1,
    elapsed: 0,
    seed,
    roomX,
    roomY,
    entrance,
    geometry,
    transition: null,
  };
}

function createCaptain(entrance: Direction, robotCount: number): Captain {
  const margin = CAPTAIN_RADIUS + 3;
  const captain: Captain = {
    x: ROOM.width / 2,
    y: ROOM.height / 2,
    radius: CAPTAIN_RADIUS,
    state: "lurking",
    lurkTimeRemaining: Math.max(2, 1.5 * robotCount),
    bouncePhase: 0,
  };
  if (entrance === "left") captain.x = -margin;
  else if (entrance === "right") captain.x = ROOM.width + margin;
  else if (entrance === "up") captain.y = -margin;
  else captain.y = ROOM.height + margin;
  return captain;
}

/** Resets in place so input and drawing code can keep their Game reference. */
export function restartGame(game: Game): void {
  const fresh = createGame();
  replaceGame(game, fresh);
}

export function updateGame(game: Game, dt: number, input: InputFrame = IDLE): GameEvent[] {
  const events: GameEvent[] = [];
  if (input.restartPressed && game.outcome === "lost" && !game.transition) {
    restartGame(game);
    return events;
  }
  if (game.transition) {
    game.transition.progress = Math.min(1, game.transition.progress + Math.max(0, dt) / game.transition.duration);
    if (game.transition.progress >= 1) game.transition = null;
    return events;
  }
  if (game.outcome === "lost") return events;

  const delta = Math.min(Math.max(dt, 0), 0.1);
  if (delta === 0) return events;
  const slices = Math.max(1, Math.ceil(delta / STEP));
  const step = delta / slices;
  for (let i = 0; i < slices && !game.transition; i += 1) {
    tick(game, step, input, events);
  }
  return events;
}

function randomSeed(random: () => number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("Game random source must return a number in [0, 1)");
  }
  return Math.floor(value * 0x1_0000_0000) >>> 0;
}

function createRandom(seed: number): () => number {
  let state = seed || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

function roomSeed(seed: number, x: number, y: number): number {
  let value = seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca77);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

function directionSide(direction: Direction): RoomSide {
  return direction === "up" ? "top" : direction === "down" ? "bottom" : direction;
}

function opposite(direction: Direction): Direction {
  if (direction === "left") return "right";
  if (direction === "right") return "left";
  if (direction === "up") return "down";
  return "up";
}

function entryCell(entrance: Direction): number {
  if (entrance === "left") return 5;
  if (entrance === "right") return 9;
  if (entrance === "up") return 2;
  return 12;
}

function chooseRobotCells(cells: readonly { x: number; y: number }[], player: { x: number; y: number },
  population: number, random: () => number, walls: readonly Wall[]): number[] {
  const candidates = cells.map((_, index) => index).filter((index) => {
    const cell = cells[index];
    return Math.hypot(cell.x - player.x, cell.y - player.y) >= 190
      && !circleHitsWall(cell.x, cell.y, ROBOT_WALL_CLEARANCE + 10, walls);
  });
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const selected: number[] = [];
  for (const index of candidates) {
    if (selected.every((other) => Math.hypot(cells[index].x - cells[other].x, cells[index].y - cells[other].y) >= 150)) {
      selected.push(index);
      if (selected.length === population) return selected;
    }
  }
  throw new Error("Unable to place robots safely in room");
}

function snapshot(game: Game): RoomSnapshot {
  return {
    difficulty: game.difficulty,
    roomX: game.roomX,
    roomY: game.roomY,
    entrance: game.entrance,
    player: { ...game.player },
    captain: { ...game.captain },
    robots: game.robots.map((robot) => ({ ...robot })),
    shots: game.shots.map((shot) => ({ ...shot })),
    walls: game.walls,
    geometry: game.geometry,
  };
}

function replaceGame(target: Game, source: Game): void {
  target.lives = source.lives;
  target.deathTimeRemaining = source.deathTimeRemaining;
  target.fireAmnestyRemaining = source.fireAmnestyRemaining;
  target.score = source.score;
  target.difficulty = source.difficulty;
  target.roomEntryScore = source.roomEntryScore;
  target.roomPopulation = source.roomPopulation;
  target.outcome = source.outcome;
  target.player = source.player;
  target.captain = source.captain;
  target.robots = source.robots;
  target.shots = source.shots;
  target.walls = source.walls;
  target.nextId = source.nextId;
  target.elapsed = source.elapsed;
  target.seed = source.seed;
  target.roomX = source.roomX;
  target.roomY = source.roomY;
  target.entrance = source.entrance;
  target.geometry = source.geometry;
  target.transition = source.transition;
}

function findExit(game: Game, x: number, y: number): Direction | null {
  const clearance = DOOR_OPENING / 2 - WALL_THICKNESS / 2 - game.player.radius;
  if (x < 0 && y >= ROOM.height / 2 - clearance && y <= ROOM.height / 2 + clearance && game.entrance !== "left") return "left";
  if (x > ROOM.width && y >= ROOM.height / 2 - clearance && y <= ROOM.height / 2 + clearance && game.entrance !== "right") return "right";
  if (y < 0 && x >= ROOM.width / 2 - clearance && x <= ROOM.width / 2 + clearance && game.entrance !== "up") return "up";
  if (y > ROOM.height && x >= ROOM.width / 2 - clearance && x <= ROOM.width / 2 + clearance && game.entrance !== "down") return "down";
  return null;
}

function beginTransition(game: Game, direction: Direction): void {
  const from = snapshot(game);
  const roomX = game.roomX + (direction === "right" ? 1 : direction === "left" ? -1 : 0);
  const roomY = game.roomY + (direction === "down" ? 1 : direction === "up" ? -1 : 0);
  const tier = difficultyForScore(game.score);
  let population = game.roomPopulation;
  if (tier.threshold === 0 || tier.threshold !== game.difficulty.threshold) population = 6;
  else if (game.score !== game.roomEntryScore) population = Math.min(12, population + 3);
  const toGame = createRoom(game.seed, roomX, roomY, opposite(direction), game.score, population);
  toGame.lives = game.lives;
  const to = snapshot(toGame);
  replaceGame(game, toGame);
  game.transition = { direction, progress: 0, duration: ROOM_SCROLL_DURATION + DOOR_CLOSE_DURATION, from, to };
}

function tick(game: Game, dt: number, input: InputFrame, events: GameEvent[]): void {
  if (game.outcome === "lost") return;
  const startingPositions = captureActorPositions(game);
  game.elapsed += dt;
  if (game.outcome === "dying") {
    updateCaptain(game, dt);
    updateRobots(game, dt, events);
    updateShots(game, dt, events, startingPositions);
    resolveContacts(game, events);
    game.deathTimeRemaining = Math.max(0, game.deathTimeRemaining - dt);
    if (game.deathTimeRemaining < 1e-9) {
      game.deathTimeRemaining = 0;
      if (game.lives > 0) respawn(game);
      else game.outcome = "lost";
    }
    return;
  }

  updateCaptain(game, dt);
  const player = game.player;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  const move = normalized(input.moveX, input.moveY);
  const nextPlayerX = player.x + move.x * PLAYER_SPEED * dt;
  const nextPlayerY = player.y + move.y * PLAYER_SPEED * dt;
  const exit = findExit(game, nextPlayerX, nextPlayerY);
  if (!exit && touchesPlayerHazard(game, nextPlayerX, nextPlayerY)) {
    defeatPlayer(game, events, nextPlayerX, nextPlayerY);
  }
  if (exit) {
    player.x = nextPlayerX;
    player.y = nextPlayerY;
  } else {
    movePlayerCircle(game, nextPlayerX, nextPlayerY);
  }

  if (game.outcome === "playing" && input.fire && player.fireCooldown <= 0) {
    const aim = normalized(input.aimX, input.aimY);
    if (aim.x !== 0 || aim.y !== 0) {
      spawnShot(game, "player", player.x, player.y, aim.x * PLAYER_SHOT_SPEED, aim.y * PLAYER_SHOT_SPEED);
      player.fireCooldown = PLAYER_FIRE_INTERVAL;
    }
  }

  updateRobots(game, dt, events);
  updateShots(game, dt, events, startingPositions);
  resolveContacts(game, events);
  game.fireAmnestyRemaining = Math.max(0, game.fireAmnestyRemaining - dt);
  // A lethal collision takes precedence over leaving, even if the last robot also dies.
  if (game.outcome === "playing" && exit) beginTransition(game, exit);
}

function defeatPlayer(game: Game, events: GameEvent[], x = game.player.x, y = game.player.y): void {
  if (game.outcome !== "playing") return;
  game.lives -= 1;
  game.outcome = "dying";
  game.deathTimeRemaining = DEATH_INTERVAL;
  events.push({ type: "player-defeated", roomX: game.roomX, roomY: game.roomY, x, y });
}

function respawn(game: Game): void {
  game.player.x = game.player.spawnX;
  game.player.y = game.player.spawnY;
  game.player.fireCooldown = 0;
  for (const robot of game.robots) {
    robot.x = robot.spawnX;
    robot.y = robot.spawnY;
  }
  game.shots = [];
  game.captain = createCaptain(game.entrance, game.robots.length);
  game.fireAmnestyRemaining = FIRE_AMNESTY;
  game.outcome = "playing";
}

function updateRobots(game: Game, dt: number, events: GameEvent[]): void {
  const player = game.player;
  for (const robot of game.robots) {
    robot.fireCooldown = Math.max(0, robot.fireCooldown - dt);
    const dx = player.x - robot.x;
    const dy = player.y - robot.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) {
      const direction = chooseRobotDirection(robot, dx / distance, dy / distance, game.walls);
      const nextX = robot.x + direction.x * robot.moveSpeed * dt;
      const nextY = robot.y + direction.y * robot.moveSpeed * dt;
      if (touchesHazard(nextX, nextY, ROBOT_WALL_CLEARANCE, game.walls)) {
        destroyRobots(game, new Set([robot.id]), events);
        continue;
      }
      moveCircle(robot, nextX, nextY, ROBOT_WALL_CLEARANCE, game.walls);
    }

    if (game.outcome === "playing" && game.fireAmnestyRemaining <= 1e-9
      && robot.fireCooldown <= 0 && game.shots.filter((shot) => shot.owner === "robot").length < game.difficulty.shotLimit
      && hasLineOfSight(robot, player, game.walls)) {
      const aim = normalized(player.x - robot.x, player.y - robot.y);
      spawnShot(game, "robot", robot.x + aim.x * (robot.radius + SHOT_RADIUS + 1),
        robot.y + aim.y * (robot.radius + SHOT_RADIUS + 1), aim.x * game.difficulty.shotSpeed, aim.y * game.difficulty.shotSpeed);
      robot.fireCooldown = ROBOT_FIRE_INTERVAL;
    }
  }
}

function updateCaptain(game: Game, dt: number): void {
  const captain = game.captain;
  if (captain.state === "lurking") {
    captain.lurkTimeRemaining = Math.max(0, captain.lurkTimeRemaining - dt);
    if (captain.lurkTimeRemaining <= 1e-9) {
      captain.lurkTimeRemaining = 0;
      captain.state = "chasing";
    }
  }
  if (captain.state !== "chasing") return;

  const dx = game.player.x - captain.x;
  const dy = game.player.y - captain.y;
  const distance = Math.hypot(dx, dy);
  captain.bouncePhase = (captain.bouncePhase + dt * Math.PI * 4) % (Math.PI * 2);
  if (distance > 0) {
    captain.x += dx / distance * CAPTAIN_SPEED * dt;
    captain.y += (dy / distance * CAPTAIN_SPEED + Math.sin(captain.bouncePhase) * CAPTAIN_BOUNCE_SPEED) * dt;
  }
}

function chooseRobotDirection(robot: Robot, dx: number, dy: number, walls: readonly Wall[]): { x: number; y: number } {
  const direct = Math.atan2(dy, dx);
  // Probe direct motion first, then nearby headings to find a route around a wall.
  const offsets = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2,
    3 * Math.PI / 4, -3 * Math.PI / 4, Math.PI];
  for (const offset of offsets) {
    const angle = direct + offset;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    if (!circleHitsWall(robot.x + x * 24, robot.y + y * 24, ROBOT_WALL_CLEARANCE, walls)) return { x, y };
  }
  return { x: 0, y: 0 };
}

interface ActorPositions {
  captain: { x: number; y: number };
}

function captureActorPositions(game: Game): ActorPositions {
  return {
    captain: { x: game.captain.x, y: game.captain.y },
  };
}

function actorVelocity(start: { x: number; y: number } | undefined, actor: { x: number; y: number }, dt: number): { x: number; y: number } {
  if (!start || dt <= 0) return { x: 0, y: 0 };
  return { x: (actor.x - start.x) / dt, y: (actor.y - start.y) / dt };
}

function updateShots(game: Game, dt: number, events: GameEvent[], startingPositions: ActorPositions): void {
  const survivors: Shot[] = [];
  for (const shot of game.shots) {
    const travel = Math.hypot(shot.velocityX, shot.velocityY) * dt;
    const slices = Math.max(1, Math.ceil(travel / (SHOT_RADIUS * 0.75)));
    let alive = true;
    for (let i = 0; i < slices && alive; i += 1) {
      shot.x += shot.velocityX * dt / slices;
      shot.y += shot.velocityY * dt / slices;
      if (shot.x < 0 || shot.y < 0 || shot.x > ROOM.width || shot.y > ROOM.height) {
        alive = false;
        break;
      }
      if (circleHitsWall(shot.x, shot.y, SHOT_RADIUS, game.walls)) {
        events.push(shotImpactEvent(game, shot, "wall", { x: 0, y: 0 }));
        alive = false;
        break;
      }
      if (game.captain.state === "chasing" && overlaps(shot, SHOT_RADIUS, game.captain, game.captain.radius)) {
        events.push(shotImpactEvent(game, shot, "captain", actorVelocity(startingPositions.captain, game.captain, dt)));
        alive = false;
        break;
      }
      if (shot.owner === "player") {
        const target = game.robots.find((robot) => overlaps(shot, SHOT_RADIUS, robot, robot.radius));
        if (target) {
          events.push(shotImpactEvent(game, shot, "robot", { x: 0, y: 0 }));
          destroyRobots(game, new Set([target.id]), events);
          alive = false;
        }
      } else {
        if (game.outcome === "playing" && overlaps(shot, SHOT_RADIUS, game.player, game.player.radius)) {
          events.push(shotImpactEvent(game, shot, "player", { x: 0, y: 0 }));
          defeatPlayer(game, events);
          alive = false;
          break;
        }
        const target = game.robots.find((robot) => overlaps(shot, SHOT_RADIUS, robot, robot.radius));
        if (target) {
          events.push(shotImpactEvent(game, shot, "robot", { x: 0, y: 0 }));
          destroyRobots(game, new Set([target.id]), events);
          alive = false;
        }
      }
    }
    if (alive) survivors.push(shot);
  }
  game.shots = survivors;
}

function shotImpactEvent(game: Game, shot: Shot, target: ShotImpactEvent["target"], targetVelocity: { x: number; y: number }): ShotImpactEvent {
  return {
    type: "shot-impact",
    roomX: game.roomX,
    roomY: game.roomY,
    x: shot.x,
    y: shot.y,
    owner: shot.owner,
    velocityX: shot.velocityX,
    velocityY: shot.velocityY,
    targetVelocityX: targetVelocity.x,
    targetVelocityY: targetVelocity.y,
    target,
  };
}

function resolveContacts(game: Game, events: GameEvent[]): void {
  if (game.outcome === "playing" && playerTouchesHazard(game)) defeatPlayer(game, events);
  for (const robot of game.robots) {
    if (entityTouchesHazard(robot, game.walls)) {
      destroyRobots(game, new Set([robot.id]), events);
    }
  }

  if (game.outcome === "playing" && game.robots.some((robot) => overlaps(robot, robot.radius, game.player, game.player.radius))) {
    defeatPlayer(game, events);
  }

  if (game.captain.state === "chasing") {
    if (game.outcome === "playing" && overlaps(game.captain, game.captain.radius, game.player, game.player.radius)) {
      defeatPlayer(game, events);
    }
  }

  const destroyed = new Set<number>();
  if (game.captain.state === "chasing") {
    for (const robot of game.robots) {
      if (overlaps(game.captain, game.captain.radius, robot, robot.radius)) destroyed.add(robot.id);
    }
  }
  for (let i = 0; i < game.robots.length; i += 1) {
    for (let j = i + 1; j < game.robots.length; j += 1) {
      const a = game.robots[i];
      const b = game.robots[j];
      if (overlaps(a, a.radius, b, b.radius)) {
        destroyed.add(a.id);
        destroyed.add(b.id);
      }
    }
  }
  if (destroyed.size > 0) destroyRobots(game, destroyed, events);
}

function destroyRobots(game: Game, ids: ReadonlySet<number>, events: GameEvent[]): void {
  const destroyedRobots = game.robots.filter((robot) => ids.has(robot.id));
  if (destroyedRobots.length === 0) return;
  const oldScore = game.score;
  game.robots = game.robots.filter((robot) => !ids.has(robot.id));
  const roomClearBonus = game.robots.length === 0 ? 100 : 0;
  game.score += destroyedRobots.length * 50 + roomClearBonus;
  destroyedRobots.forEach((robot, index) => {
    events.push({
      type: "robot-destroyed",
      roomX: game.roomX,
      roomY: game.roomY,
      x: robot.x,
      y: robot.y,
      color: game.difficulty.color,
      points: 50 + (index === 0 ? roomClearBonus : 0),
    });
  });
  for (const threshold of [10_000, 50_000]) {
    if (oldScore < threshold && game.score >= threshold) game.lives += 1;
  }
}

function spawnShot(game: Game, owner: Shot["owner"], x: number, y: number, velocityX: number, velocityY: number): void {
  game.shots.push({ id: game.nextId++, owner, x, y, velocityX, velocityY });
}

function moveCircle(entity: { x: number; y: number }, x: number, y: number, radius: number, walls: readonly Wall[]): void {
  // Resolve axes separately to allow sliding along partitions.
  if (!circleHitsWall(x, entity.y, radius, walls)) entity.x = clamp(x, radius, ROOM.width - radius);
  if (!circleHitsWall(entity.x, y, radius, walls)) entity.y = clamp(y, radius, ROOM.height - radius);
}

function circleHitsWall(x: number, y: number, radius: number, walls: readonly Wall[]): boolean {
  return walls.some((wall) => {
    const nearestX = clamp(x, wall.x, wall.x + wall.width);
    const nearestY = clamp(y, wall.y, wall.y + wall.height);
    return Math.hypot(x - nearestX, y - nearestY) <= radius;
  });
}

function entityTouchesHazard(entity: { x: number; y: number; radius: number }, walls: readonly Wall[]): boolean {
  return touchesHazard(entity.x, entity.y, entity.radius, walls);
}

function playerTouchesHazard(game: Game): boolean {
  return touchesPlayerHazard(game, game.player.x, game.player.y);
}

function touchesHazard(x: number, y: number, radius: number, walls: readonly Wall[]): boolean {
  if (x <= radius || y <= radius || x >= ROOM.width - radius || y >= ROOM.height - radius) return true;
  return walls.some((wall) => wall.electrified && circleHitsSingleWall(x, y, radius, wall));
}

function touchesPlayerHazard(game: Game, x: number, y: number): boolean {
  const r = game.player.radius;
  const onOpenLeft = game.entrance !== "left" && x <= r && openDoorClearance(y, ROOM.height / 2, r);
  const onOpenRight = game.entrance !== "right" && x >= ROOM.width - r && openDoorClearance(y, ROOM.height / 2, r);
  const onOpenTop = game.entrance !== "up" && y <= r && openDoorClearance(x, ROOM.width / 2, r);
  const onOpenBottom = game.entrance !== "down" && y >= ROOM.height - r && openDoorClearance(x, ROOM.width / 2, r);
  if ((x <= r && !onOpenLeft) || (x >= ROOM.width - r && !onOpenRight)
    || (y <= r && !onOpenTop) || (y >= ROOM.height - r && !onOpenBottom)) return true;
  return game.walls.some((wall) => wall.electrified && circleHitsSingleWall(x, y, r, wall));
}

function openDoorClearance(value: number, center: number, radius: number): boolean {
  const clearance = DOOR_OPENING / 2 - WALL_THICKNESS / 2 - radius;
  return Math.abs(value - center) <= clearance;
}

function movePlayerCircle(game: Game, x: number, y: number): void {
  const player = game.player;
  const r = player.radius;
  if (!circleHitsWall(x, player.y, r, game.walls)) {
    const inVerticalOpening = openDoorClearance(player.y, ROOM.height / 2, r);
    if ((x >= r || (game.entrance !== "left" && inVerticalOpening))
      && (x <= ROOM.width - r || (game.entrance !== "right" && inVerticalOpening))) player.x = x;
    else player.x = clamp(x, r, ROOM.width - r);
  }
  if (!circleHitsWall(player.x, y, r, game.walls)) {
    const inHorizontalOpening = openDoorClearance(player.x, ROOM.width / 2, r);
    if ((y >= r || (game.entrance !== "up" && inHorizontalOpening))
      && (y <= ROOM.height - r || (game.entrance !== "down" && inHorizontalOpening))) player.y = y;
    else player.y = clamp(y, r, ROOM.height - r);
  }
}

function circleHitsSingleWall(x: number, y: number, radius: number, wall: Wall): boolean {
  const nearX = clamp(x, wall.x, wall.x + wall.width);
  const nearY = clamp(y, wall.y, wall.y + wall.height);
  return Math.hypot(x - nearX, y - nearY) <= radius;
}

function hasLineOfSight(a: { x: number; y: number }, b: { x: number; y: number }, walls: readonly Wall[]): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.ceil(distance / 5);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (circleHitsWall(a.x + dx * t, a.y + dy * t, SHOT_RADIUS, walls)) return false;
  }
  return true;
}

function overlaps(a: { x: number; y: number }, aRadius: number,
  b: { x: number; y: number }, bRadius: number): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= aRadius + bRadius + CONTACT_RADIUS;
}

function normalized(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (length <= 1) return { x, y };
  return { x: x / length, y: y / length };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
