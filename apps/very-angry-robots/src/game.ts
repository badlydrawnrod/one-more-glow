import { createMaze, ROOM } from "./maze.ts";
export { ROOM } from "./maze.ts";

/** The simulation is expressed in room pixels and does not depend on rendering or input APIs. */

export type Outcome = "playing" | "won" | "lost";

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
  electrified: boolean;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  fireCooldown: number;
}

export interface Robot {
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

export interface Game {
  outcome: Outcome;
  player: Player;
  robots: Robot[];
  shots: Shot[];
  walls: Wall[];
  nextId: number;
  elapsed: number;
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
const ROBOT_SHOT_SPEED = 235;
const ROBOT_FIRE_INTERVAL = 1.15;
const SHOT_RADIUS = 4;
const CONTACT_RADIUS = 2;
const STEP = 1 / 120;

const INITIAL_ROBOTS: readonly Omit<Robot, "id">[] = [
  { x: 0, y: 0, radius: 14, moveSpeed: 82, fireCooldown: 0.4 },
  { x: 0, y: 0, radius: 14, moveSpeed: 76, fireCooldown: 1.1 },
  { x: 0, y: 0, radius: 14, moveSpeed: 72, fireCooldown: 1.8 },
  { x: 0, y: 0, radius: 14, moveSpeed: 78, fireCooldown: 0.8 },
];

const IDLE: InputFrame = {
  moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, restartPressed: false,
};

export function createGame(random: () => number = Math.random): Game {
  const maze = createMaze(random);
  const playerStart = maze.cellCenters[5];
  const robotCells = [4, 14, 2, 12];
  return {
    outcome: "playing",
    player: { ...playerStart, radius: 14, fireCooldown: 0 },
    robots: INITIAL_ROBOTS.map((robot, index) => ({ ...robot, ...maze.cellCenters[robotCells[index]], id: index + 1 })),
    shots: [],
    walls: maze.walls,
    nextId: INITIAL_ROBOTS.length + 1,
    elapsed: 0,
  };
}

/** Resets in place so input and drawing code can keep their Game reference. */
export function restartGame(game: Game): void {
  const fresh = createGame();
  game.outcome = fresh.outcome;
  game.player = fresh.player;
  game.robots = fresh.robots;
  game.shots = fresh.shots;
  game.walls = fresh.walls;
  game.nextId = fresh.nextId;
  game.elapsed = fresh.elapsed;
}

export function updateGame(game: Game, dt: number, input: InputFrame = IDLE): void {
  if (input.restartPressed) {
    restartGame(game);
    return;
  }
  if (game.outcome !== "playing") return;

  const delta = Math.min(Math.max(dt, 0), 0.1);
  if (delta === 0) return;
  const slices = Math.max(1, Math.ceil(delta / STEP));
  const step = delta / slices;
  for (let i = 0; i < slices && game.outcome === "playing"; i += 1) {
    tick(game, step, input);
  }
}

function tick(game: Game, dt: number, input: InputFrame): void {
  game.elapsed += dt;
  const player = game.player;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);

  const move = normalized(input.moveX, input.moveY);
  const nextPlayerX = player.x + move.x * PLAYER_SPEED * dt;
  const nextPlayerY = player.y + move.y * PLAYER_SPEED * dt;
  if (touchesHazard(nextPlayerX, nextPlayerY, player.radius, game.walls)) game.outcome = "lost";
  moveCircle(player, nextPlayerX, nextPlayerY, player.radius, game.walls);

  if (input.fire && player.fireCooldown <= 0) {
    const aim = normalized(input.aimX, input.aimY);
    if (aim.x !== 0 || aim.y !== 0) {
      spawnShot(game, "player", player.x, player.y, aim.x * PLAYER_SHOT_SPEED, aim.y * PLAYER_SHOT_SPEED);
      player.fireCooldown = PLAYER_FIRE_INTERVAL;
    }
  }

  updateRobots(game, dt);
  updateShots(game, dt);
  resolveContacts(game);

  // Loss takes precedence if the final robot and player are defeated in one tick.
  if (playerTouchesHazard(player, game.walls)) game.outcome = "lost";
  if (game.outcome === "playing" && game.robots.length === 0) game.outcome = "won";
}

function updateRobots(game: Game, dt: number): void {
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
      if (touchesHazard(nextX, nextY, robot.radius, game.walls)) {
        game.robots = game.robots.filter((candidate) => candidate.id !== robot.id);
        continue;
      }
      moveCircle(robot, nextX, nextY, robot.radius, game.walls);
    }

    if (robot.fireCooldown <= 0 && hasLineOfSight(robot, player, game.walls)) {
      const aim = normalized(player.x - robot.x, player.y - robot.y);
      spawnShot(game, "robot", robot.x + aim.x * (robot.radius + SHOT_RADIUS + 1),
        robot.y + aim.y * (robot.radius + SHOT_RADIUS + 1), aim.x * ROBOT_SHOT_SPEED, aim.y * ROBOT_SHOT_SPEED);
      robot.fireCooldown = ROBOT_FIRE_INTERVAL;
    }
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
    if (!circleHitsWall(robot.x + x * 24, robot.y + y * 24, robot.radius, walls)) return { x, y };
  }
  return { x: 0, y: 0 };
}

function updateShots(game: Game, dt: number): void {
  const survivors: Shot[] = [];
  for (const shot of game.shots) {
    const travel = Math.hypot(shot.velocityX, shot.velocityY) * dt;
    const slices = Math.max(1, Math.ceil(travel / (SHOT_RADIUS * 0.75)));
    let alive = true;
    for (let i = 0; i < slices && alive; i += 1) {
      shot.x += shot.velocityX * dt / slices;
      shot.y += shot.velocityY * dt / slices;
      if (shot.x < 0 || shot.y < 0 || shot.x > ROOM.width || shot.y > ROOM.height
        || circleHitsWall(shot.x, shot.y, SHOT_RADIUS, game.walls)) {
        alive = false;
        break;
      }
      if (shot.owner === "player") {
        const target = game.robots.find((robot) => overlaps(shot, SHOT_RADIUS, robot, robot.radius));
        if (target) {
          game.robots = game.robots.filter((robot) => robot.id !== target.id);
          alive = false;
        }
      } else {
        if (overlaps(shot, SHOT_RADIUS, game.player, game.player.radius)) {
          game.outcome = "lost";
          alive = false;
          break;
        }
        const target = game.robots.find((robot) => overlaps(shot, SHOT_RADIUS, robot, robot.radius));
        if (target) {
          game.robots = game.robots.filter((robot) => robot.id !== target.id);
          alive = false;
        }
      }
    }
    if (alive) survivors.push(shot);
  }
  game.shots = survivors;
}

function resolveContacts(game: Game): void {
  if (playerTouchesHazard(game.player, game.walls)) game.outcome = "lost";
  for (const robot of game.robots) {
    if (entityTouchesHazard(robot, game.walls)) {
      game.robots = game.robots.filter((candidate) => candidate.id !== robot.id);
    }
  }

  if (game.robots.some((robot) => overlaps(robot, robot.radius, game.player, game.player.radius))) {
    game.outcome = "lost";
  }

  const destroyed = new Set<number>();
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
  if (destroyed.size > 0) game.robots = game.robots.filter((robot) => !destroyed.has(robot.id));
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

function playerTouchesHazard(player: Player, walls: readonly Wall[]): boolean {
  return touchesHazard(player.x, player.y, player.radius, walls);
}

function touchesHazard(x: number, y: number, radius: number, walls: readonly Wall[]): boolean {
  if (x <= radius || y <= radius || x >= ROOM.width - radius || y >= ROOM.height - radius) return true;
  return walls.some((wall) => wall.electrified && circleHitsSingleWall(x, y, radius, wall));
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
