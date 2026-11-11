export const WORLD = { halfWidth: 512, halfHeight: 384 } as const;

export type Screen = "title" | "playing" | "intermission" | "paused" | "gameover";
export type AsteroidSize = "large" | "medium" | "small";

export interface InputFrame {
  turn: number;
  thrust: boolean;
  fire: boolean;
  hyperspacePressed: boolean;
  startPressed: boolean;
  pausePressed: boolean;
  connected: boolean;
}

export interface Ship {
  x: number; y: number; heading: number; velocityX: number; velocityY: number;
  alive: boolean; invulnerable: number; hyperspaceCooldown: number;
  fireCooldown: number; deathRemaining: number; respawnDelay: number;
}

export interface Asteroid {
  id: number; x: number; y: number; size: AsteroidSize; radius: number;
  angle: number; spin: number; velocityX: number; velocityY: number;
  shape: readonly (readonly [number, number])[];
}

export interface Projectile {
  id: number; owner: "player" | "saucer"; x: number; y: number;
  velocityX: number; velocityY: number; age: number;
}

export interface Saucer {
  id: number; kind: "large" | "small"; x: number; y: number;
  velocityX: number; velocityY: number; age: number; turnIn: number;
  fireIn: number;
}

export interface Explosion { x: number; y: number; remaining: number; }

export interface Game {
  screen: Screen; wave: number; score: number; highScore: number; lives: number;
  pausedFrom: "playing" | "intermission";
  ship: Ship; asteroids: Asteroid[]; projectiles: Projectile[];
  saucer: Saucer | null; saucerSpawnIn: number; intermission: number;
  waveBanner: number; explosions: Explosion[]; thrusting: boolean;
  inputConnected: boolean; nextId: number; random: () => number;
}

const ASTEROID_RADII: Record<AsteroidSize, number> = { large: 58, medium: 32, small: 17 };
const SPLIT_SIZE: Partial<Record<AsteroidSize, AsteroidSize>> = { large: "medium", medium: "small" };
const POINTS: Record<AsteroidSize, number> = { large: 20, medium: 50, small: 100 };
const FLIGHT = {
  rotationRate: 3.4,
  thrustAcceleration: 175,
  dragPerFrame: 0.992,
  referenceFps: 60,
  maximumSpeed: 360,
  asteroidSpeedMinimum: 20,
  asteroidSpeedRange: 24,
  largeSaucerSpeed: 48,
  smallSaucerSpeed: 68,
  smallSaucerAimError: 0.18,
} as const;

export function createGame(random: () => number = Math.random): Game {
  return {
    screen: "title", wave: 0, score: 0, highScore: 0, lives: 0, pausedFrom: "playing",
    ship: makeShip(), asteroids: [], projectiles: [], saucer: null,
    saucerSpawnIn: 0, intermission: 0, waveBanner: 0, explosions: [],
    thrusting: false, inputConnected: false, nextId: 1, random,
  };
}

function makeShip(): Ship {
  return { x: 0, y: 0, heading: 0, velocityX: 0, velocityY: 0, alive: true,
    invulnerable: 0, hyperspaceCooldown: 0, fireCooldown: 0,
    deathRemaining: 0, respawnDelay: 0 };
}

export function startRun(game: Game): void {
  game.score = 0;
  game.lives = 3;
  game.wave = 1;
  game.ship = makeShip();
  game.projectiles = [];
  game.saucer = null;
  game.explosions = [];
  startWave(game, false);
}

function startWave(game: Game, increment: boolean): void {
  if (increment) game.wave += 1;
  game.screen = "playing";
  game.intermission = 0;
  game.waveBanner = 2;
  game.projectiles = [];
  game.saucer = null;
  game.asteroids = [];
  const count = waveStartAsteroidCount(game.wave);
  const speedFactor = waveSpeedFactor(game.wave);
  for (let i = 0; i < count; i += 1) {
    let x = wrap(game.ship.x + WORLD.halfWidth, WORLD.halfWidth);
    let y = wrap(game.ship.y + WORLD.halfHeight, WORLD.halfHeight);
    const minimumDistance = Math.min(WORLD.halfWidth, WORLD.halfHeight) / 4;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const candidateX = game.random() * WORLD.halfWidth * 2 - WORLD.halfWidth;
      const candidateY = game.random() * WORLD.halfHeight * 2 - WORLD.halfHeight;
      if (distance(candidateX, candidateY, game.ship.x, game.ship.y) >= minimumDistance) {
        x = candidateX;
        y = candidateY;
        break;
      }
    }
    const direction = game.random() * Math.PI * 2;
    const speed = (FLIGHT.asteroidSpeedMinimum + game.random() * FLIGHT.asteroidSpeedRange) * speedFactor;
    game.asteroids.push(makeAsteroid(game, x, y, "large",
      Math.cos(direction) * speed, Math.sin(direction) * speed));
  }
  game.saucerSpawnIn = saucerDelay(game.wave);
}

function makeAsteroid(game: Game, x: number, y: number, size: AsteroidSize,
  velocityX: number, velocityY: number): Asteroid {
  const radius = ASTEROID_RADII[size];
  const angle = game.random() * Math.PI * 2;
  const notch = Math.floor(angle / (Math.PI * 2) * 10);
  const shape = Array.from({ length: 10 }, (_, i) => {
    const a = i * Math.PI * 2 / 10;
    const variation = game.random();
    const r = radius * (i === notch ? 0.5 + variation * 0.12 : 0.82 + variation * 0.26);
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  });
  return { id: game.nextId++, x, y, size, radius, angle,
    spin: (game.random() * 2 - 1) * (size === "large" ? 0.35 : 0.7),
    velocityX, velocityY, shape };
}

function saucerDelay(wave: number): number { return Math.max(20 - (wave - 1), 8); }
function saucerFireInterval(wave: number): number { return Math.max(2 - 0.1 * (wave - 1), 0.8); }
function wrap(v: number, half: number): number { const s = half * 2; return ((v + half) % s + s) % s - half; }
function delta(a: number, b: number, half: number): number { const s = half * 2; return ((a - b + half) % s + s) % s - half; }
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(delta(x1, x2, WORLD.halfWidth), delta(y1, y2, WORLD.halfHeight));
}
function saucerDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, delta(y1, y2, WORLD.halfHeight));
}

export function updateGame(game: Game, dt: number, input: InputFrame): void {
  const step = Math.min(Math.max(dt, 0), 0.05);
  game.inputConnected = input.connected;
  game.thrusting = false;
  if (game.screen === "title") {
    if (input.startPressed) startRun(game);
    return;
  }
  if (game.screen === "gameover") {
    if (input.startPressed) startRun(game);
    return;
  }
  if (input.pausePressed && (game.screen === "playing" || game.screen === "intermission")) {
    game.pausedFrom = game.screen;
    game.screen = "paused";
    return;
  }
  if (game.screen === "paused") {
    if (input.pausePressed || input.startPressed) game.screen = game.pausedFrom;
    return;
  }
  if (game.screen === "intermission") {
    updateEffects(game, step);
    updatePlayer(game, step, input);
    updateProjectiles(game, step);
    game.intermission -= step;
    if (game.intermission <= 0) startWave(game, true);
    return;
  }

  updatePlaying(game, step, input);
}

function updatePlaying(game: Game, dt: number, input: InputFrame): void {
  const ship = game.ship;
  game.waveBanner = Math.max(0, game.waveBanner - dt);
  updateEffects(game, dt);

  const shipWasAlive = ship.alive;
  updatePlayer(game, dt, input);
  if (game.screen === "gameover") return;

  updateAsteroids(game, dt);
  updateSaucer(game, dt);
  updateProjectiles(game, dt);
  resolveCollisions(game);

  if (!shipWasAlive && ship.alive) return;
  if (game.asteroids.length === 0 && game.screen === "playing"
    && (game.ship.alive || game.lives > 0)) {
    game.screen = "intermission";
    game.intermission = 2;
    game.saucer = null;
    game.projectiles = [];
  }
}

function updatePlayer(game: Game, dt: number, input: InputFrame): void {
  const ship = game.ship;
  if (ship.alive) {
    ship.heading += input.turn * FLIGHT.rotationRate * dt;
    if (input.thrust) {
      ship.velocityX += Math.sin(ship.heading) * FLIGHT.thrustAcceleration * dt;
      ship.velocityY += Math.cos(ship.heading) * FLIGHT.thrustAcceleration * dt;
    }
    ship.velocityX *= Math.pow(FLIGHT.dragPerFrame, dt * FLIGHT.referenceFps);
    ship.velocityY *= Math.pow(FLIGHT.dragPerFrame, dt * FLIGHT.referenceFps);
    const speed = Math.hypot(ship.velocityX, ship.velocityY);
    if (speed > FLIGHT.maximumSpeed) {
      ship.velocityX *= FLIGHT.maximumSpeed / speed;
      ship.velocityY *= FLIGHT.maximumSpeed / speed;
    }
    ship.x = wrap(ship.x + ship.velocityX * dt, WORLD.halfWidth);
    ship.y = wrap(ship.y + ship.velocityY * dt, WORLD.halfHeight);
    ship.invulnerable = Math.max(0, ship.invulnerable - dt);
    ship.hyperspaceCooldown = Math.max(0, ship.hyperspaceCooldown - dt);
    ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);
    game.thrusting = input.thrust;
    if (input.hyperspacePressed && ship.hyperspaceCooldown <= 0) {
      ship.x = game.random() * WORLD.halfWidth * 2 - WORLD.halfWidth;
      ship.y = game.random() * WORLD.halfHeight * 2 - WORLD.halfHeight;
      ship.velocityX = 0;
      ship.velocityY = 0;
      ship.hyperspaceCooldown = 5;
    }
    if (input.fire && ship.fireCooldown <= 0 && activePlayerShots(game) < 4) {
      spawnPlayerShot(game);
      ship.fireCooldown = 0.2;
    }
  } else {
    ship.deathRemaining -= dt;
    ship.respawnDelay -= dt;
    if (ship.deathRemaining <= 0 && game.lives <= 0) {
      game.screen = "gameover";
      return;
    }
    if (ship.deathRemaining <= 0 && ship.respawnDelay <= 0) {
      if (isRespawnAreaSafe(game)) {
        ship.x = 0; ship.y = 0; ship.heading = 0;
        ship.velocityX = 0; ship.velocityY = 0;
        ship.alive = true; ship.invulnerable = 2;
      }
    }
  }
}

function updateEffects(game: Game, dt: number): void {
  for (const explosion of game.explosions) explosion.remaining -= dt;
  game.explosions = game.explosions.filter((explosion) => explosion.remaining > 0);
}

function activePlayerShots(game: Game): number { return game.projectiles.filter((shot) => shot.owner === "player").length; }
function spawnPlayerShot(game: Game): void {
  const { ship } = game;
  const vx = Math.sin(ship.heading) * 520 + ship.velocityX;
  const vy = Math.cos(ship.heading) * 520 + ship.velocityY;
  game.projectiles.push({ id: game.nextId++, owner: "player",
    x: wrap(ship.x + Math.sin(ship.heading) * 24, WORLD.halfWidth),
    y: wrap(ship.y + Math.cos(ship.heading) * 24, WORLD.halfHeight),
    velocityX: vx, velocityY: vy, age: 0 });
}

function updateAsteroids(game: Game, dt: number): void {
  for (const a of game.asteroids) {
    a.x = wrap(a.x + a.velocityX * dt, WORLD.halfWidth);
    a.y = wrap(a.y + a.velocityY * dt, WORLD.halfHeight);
    a.angle += a.spin * dt;
  }
}

function spawnSaucer(game: Game): void {
  const smallChance = Math.min(0.1 + 0.05 * (game.wave - 1), 0.7);
  const kind = game.random() < smallChance ? "small" : "large";
  const fromLeft = game.random() < 0.5;
  const speed = kind === "small" ? FLIGHT.smallSaucerSpeed : FLIGHT.largeSaucerSpeed;
  game.saucer = { id: game.nextId++, kind,
    x: fromLeft ? -WORLD.halfWidth - 24 : WORLD.halfWidth + 24,
    y: game.random() * WORLD.halfHeight * 2 - WORLD.halfHeight,
    velocityX: fromLeft ? speed : -speed,
    velocityY: (game.random() * 2 - 1) * 14,
    age: 0, turnIn: 1 + game.random() * 2,
    fireIn: saucerFireInterval(game.wave) };
}

function updateSaucer(game: Game, dt: number): void {
  if (!game.saucer) {
    if (game.ship.alive) {
      game.saucerSpawnIn -= dt;
      if (game.saucerSpawnIn <= 0) spawnSaucer(game);
    }
    return;
  }
  const saucer = game.saucer;
  saucer.age += dt;
  saucer.x += saucer.velocityX * dt;
  saucer.y = wrap(saucer.y + saucer.velocityY * dt, WORLD.halfHeight);
  saucer.turnIn -= dt;
  if (saucer.turnIn <= 0) {
    saucer.velocityY = (game.random() * 2 - 1) * 26;
    saucer.turnIn = 0.8 + game.random() * 2.2;
  }
  saucer.fireIn -= dt;
  if (saucer.fireIn <= 0 && game.ship.alive) {
    const targetAngle = Math.atan2(delta(game.ship.x, saucer.x, WORLD.halfWidth),
      delta(game.ship.y, saucer.y, WORLD.halfHeight));
    const angle = saucer.kind === "small"
      ? targetAngle + (game.random() * 2 - 1) * FLIGHT.smallSaucerAimError
      : game.random() * Math.PI * 2;
    const speed = 245;
    game.projectiles.push({ id: game.nextId++, owner: "saucer", x: saucer.x, y: saucer.y,
      velocityX: Math.sin(angle) * speed, velocityY: Math.cos(angle) * speed, age: 0 });
    saucer.fireIn = saucerFireInterval(game.wave);
  }
  const exited = saucer.age >= 15 || (saucer.velocityX > 0 && saucer.x > WORLD.halfWidth + 24)
    || (saucer.velocityX < 0 && saucer.x < -WORLD.halfWidth - 24);
  if (exited) { game.saucer = null; game.saucerSpawnIn = saucerDelay(game.wave); }
}

function updateProjectiles(game: Game, dt: number): void {
  for (const shot of game.projectiles) {
    shot.age += dt;
    shot.x = wrap(shot.x + shot.velocityX * dt, WORLD.halfWidth);
    shot.y = wrap(shot.y + shot.velocityY * dt, WORLD.halfHeight);
  }
  game.projectiles = game.projectiles.filter((shot) => shot.age < (shot.owner === "player" ? 1.2 : 2));
}

function isRespawnAreaSafe(game: Game): boolean {
  const limit = Math.min(WORLD.halfWidth, WORLD.halfHeight) / 10;
  if (game.asteroids.some((a) => distance(a.x, a.y, 0, 0) < limit + a.radius)) return false;
  if (game.saucer && saucerDistance(game.saucer.x, game.saucer.y, 0, 0) < limit + 24) return false;
  return !game.projectiles.some((p) => p.owner === "saucer" && distance(p.x, p.y, 0, 0) < limit + 5);
}

function resolveCollisions(game: Game): void {
  const consumedShots = new Set<number>();
  const destroyedAsteroids = new Set<number>();
  const scoredTargets = new Set<number>();
  let saucerDestroyed = false;
  const addScore = (points: number) => {
    const oldScore = game.score;
    game.score += points;
    game.lives += Math.floor(game.score / 10000) - Math.floor(oldScore / 10000);
    game.highScore = Math.max(game.highScore, game.score);
  };

  for (const shot of game.projectiles) {
    if (shot.owner !== "player") continue;
    for (const asteroid of game.asteroids) {
      if (destroyedAsteroids.has(asteroid.id)) continue;
      if (distance(shot.x, shot.y, asteroid.x, asteroid.y) <= asteroid.radius + 3) {
        consumedShots.add(shot.id); destroyedAsteroids.add(asteroid.id);
        if (!scoredTargets.has(asteroid.id)) { addScore(POINTS[asteroid.size]); scoredTargets.add(asteroid.id); }
        break;
      }
    }
    if (!consumedShots.has(shot.id) && game.saucer && !saucerDestroyed
      && saucerDistance(shot.x, shot.y, game.saucer.x, game.saucer.y) <= (game.saucer.kind === "small" ? 17 : 25) + 3) {
      consumedShots.add(shot.id); saucerDestroyed = true;
      addScore(game.saucer.kind === "small" ? 1000 : 200);
    }
  }

  for (const shot of game.projectiles) {
    if (shot.owner !== "saucer" || consumedShots.has(shot.id)) continue;
    const asteroid = game.asteroids.find((a) => !destroyedAsteroids.has(a.id)
      && distance(shot.x, shot.y, a.x, a.y) <= a.radius + 4);
    if (asteroid) { consumedShots.add(shot.id); destroyedAsteroids.add(asteroid.id); continue; }
    if (game.ship.alive && distance(shot.x, shot.y, game.ship.x, game.ship.y) <= 22) {
      consumedShots.add(shot.id);
      if (game.ship.invulnerable <= 0) destroyShip(game);
    }
  }

  if (game.saucer && !saucerDestroyed) {
    if (game.asteroids.some((a) => !destroyedAsteroids.has(a.id)
      && saucerDistance(a.x, a.y, game.saucer!.x, game.saucer!.y) <= a.radius + 24)) saucerDestroyed = true;
    if (game.ship.alive && saucerDistance(game.ship.x, game.ship.y, game.saucer.x, game.saucer.y) <= 30
      && game.ship.invulnerable <= 0) {
      saucerDestroyed = true;
      destroyShip(game);
    }
  }

  for (const asteroid of game.asteroids) {
    if (destroyedAsteroids.has(asteroid.id)) continue;
    if (game.ship.alive && distance(game.ship.x, game.ship.y, asteroid.x, asteroid.y) <= asteroid.radius + 18
      && game.ship.invulnerable <= 0) destroyShip(game);
  }

  game.projectiles = game.projectiles.filter((shot) => !consumedShots.has(shot.id));
  if (saucerDestroyed && game.saucer) {
    if (!scoredTargets.has(game.saucer.id)) game.saucerSpawnIn = saucerDelay(game.wave);
    game.explosions.push({ x: game.saucer.x, y: game.saucer.y, remaining: 0.45 });
    game.saucer = null;
  }
  if (destroyedAsteroids.size) {
    const survivors: Asteroid[] = [];
    for (const asteroid of game.asteroids) {
      if (!destroyedAsteroids.has(asteroid.id)) { survivors.push(asteroid); continue; }
      const childSize = SPLIT_SIZE[asteroid.size];
      if (childSize) {
        const base = Math.atan2(asteroid.velocityY, asteroid.velocityX);
        const parentSpeed = Math.hypot(asteroid.velocityX, asteroid.velocityY);
        for (const direction of [base - 0.7, base + 0.7]) {
          const speed = parentSpeed * 1.45 + 16;
          survivors.push(makeAsteroid(game, asteroid.x, asteroid.y, childSize,
            Math.cos(direction) * speed, Math.sin(direction) * speed));
        }
      }
      game.explosions.push({ x: asteroid.x, y: asteroid.y, remaining: 0.35 });
    }
    game.asteroids = survivors;
  }
}

function destroyShip(game: Game): void {
  if (!game.ship.alive) return;
  game.ship.alive = false;
  game.ship.deathRemaining = 0.8;
  game.ship.respawnDelay = 2;
  game.lives = Math.max(0, game.lives - 1);
  game.projectiles = game.projectiles.filter((shot) => shot.owner !== "player");
  game.explosions.push({ x: game.ship.x, y: game.ship.y, remaining: 0.8 });
}

export function respawnIsWaiting(game: Game): boolean {
  return game.screen === "playing" && !game.ship.alive && game.lives > 0
    && game.ship.deathRemaining <= 0 && game.ship.respawnDelay <= 0 && !isRespawnAreaSafe(game);
}

export function waveStartAsteroidCount(wave: number): number { return Math.min(4 + wave - 1, 12); }
export function waveSpeedFactor(wave: number): number { return Math.min(1 + 0.08 * (wave - 1), 2); }
export function waveSaucerDelay(wave: number): number { return saucerDelay(wave); }
export function waveSmallSaucerChance(wave: number): number { return Math.min(0.1 + 0.05 * (wave - 1), 0.7); }
export function waveSaucerFireInterval(wave: number): number { return saucerFireInterval(wave); }
