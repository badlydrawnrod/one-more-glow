import assert from "node:assert/strict";
import test from "node:test";
import { InputController } from "./input.ts";
import { readHighScore, writeHighScore } from "./high-score.ts";
import {
  createGame,
  respawnIsWaiting,
  startRun,
  updateGame,
  waveSaucerDelay,
  waveSaucerFireInterval,
  waveSmallSaucerChance,
  waveSpeedFactor,
  waveStartAsteroidCount,
} from "./game.ts";

const idle = {
  turn: 0, thrust: false, fire: false, hyperspacePressed: false,
  startPressed: false, pausePressed: false, connected: false,
};

function makeGame() {
  const game = createGame(() => 0.314);
  startRun(game);
  return game;
}

function asteroid(game, x, y, radius = 20, size = "small") {
  return { id: game.nextId++, x, y, size, radius, angle: 0, spin: 0,
    velocityX: 0, velocityY: 0, shape: [[radius, 0], [0, radius], [-radius, 0]] };
}

function advance(game, seconds, input = idle) {
  let remaining = seconds;
  while (remaining > 0) {
    const dt = Math.min(0.05, remaining);
    updateGame(game, dt, input);
    remaining -= dt;
  }
}

test("a run starts with three lives and wave one asteroids clear of the ship", () => {
  const game = makeGame();
  assert.equal(game.screen, "playing");
  assert.equal(game.wave, 1);
  assert.equal(game.lives, 3);
  assert.equal(game.asteroids.length, 4);
  assert.ok(game.asteroids.every((a) => Math.hypot(a.x, a.y) >= 192));
});

test("pause freezes active gameplay and restores a paused intermission", () => {
  const game = makeGame();
  game.ship.hyperspaceCooldown = 3;
  updateGame(game, 0.05, { ...idle, pausePressed: true });
  assert.equal(game.screen, "paused");
  updateGame(game, 1, idle);
  assert.equal(game.ship.hyperspaceCooldown, 3);
  updateGame(game, 0, { ...idle, pausePressed: true });
  assert.equal(game.screen, "playing");

  game.screen = "intermission";
  game.intermission = 1;
  updateGame(game, 0, { ...idle, pausePressed: true });
  updateGame(game, 2, idle);
  updateGame(game, 0, { ...idle, pausePressed: true });
  assert.equal(game.screen, "intermission");
  assert.equal(game.intermission, 1);
});

test("player shots split and score asteroids, and each shot is consumed once", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 0, 24, 30, "large")];
  updateGame(game, 0.01, { ...idle, fire: true });
  assert.equal(game.score, 20);
  assert.equal(game.asteroids.length, 2);
  assert.ok(game.asteroids.every((a) => a.size === "medium"));
  assert.equal(game.projectiles.length, 0);
});

test("player shots score and split every asteroid size correctly", () => {
  for (const [size, points, childSize] of [
    ["medium", 50, "small"], ["small", 100, undefined],
  ]) {
    const game = makeGame();
    game.asteroids = [asteroid(game, 0, 24, 18, size)];
    game.projectiles = [{ id: game.nextId++, owner: "player", x: 0, y: 24,
      velocityX: 0, velocityY: 0, age: 0 }];
    updateGame(game, 0.01, idle);
    assert.equal(game.score, points);
    if (childSize) assert.ok(game.asteroids.length === 2 && game.asteroids.every((a) => a.size === childSize));
    else assert.equal(game.asteroids.length, 0);
  }
});

test("player shots award saucer points while non-player hits award none", () => {
  const game = makeGame();
  game.asteroids = [];
  game.saucer = { id: game.nextId++, kind: "small", x: 0, y: 24,
    velocityX: 0, velocityY: 0, age: 0, turnIn: 10, fireIn: 10 };
  game.projectiles = [{ id: game.nextId++, owner: "player", x: 0, y: 24,
    velocityX: 0, velocityY: 0, age: 0 }];
  updateGame(game, 0.01, idle);
  assert.equal(game.score, 1000);
  assert.equal(game.saucer, null);
});

test("edge-wrapped projectile collision hits once and extra lives count crossed thresholds", () => {
  const game = makeGame();
  game.score = 9980;
  game.asteroids = [asteroid(game, -510, 0, 18, "small")];
  game.projectiles = [{ id: game.nextId++, owner: "player", x: 510, y: 0,
    velocityX: 0, velocityY: 0, age: 0 }];
  updateGame(game, 0.01, idle);
  assert.equal(game.score, 10080);
  assert.equal(game.lives, 4);
  assert.equal(game.asteroids.length, 0);
  assert.equal(game.projectiles.length, 0);
  assert.equal(game.screen, "intermission");
});

test("projectile collision wraps across a playfield corner", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, -510, -380, 18, "small")];
  game.projectiles = [{ id: game.nextId++, owner: "player", x: 510, y: 380,
    velocityX: 0, velocityY: 0, age: 0 }];
  updateGame(game, 0.01, idle);
  assert.equal(game.score, 100);
  assert.equal(game.asteroids.length, 0);
});

test("saucer shots split asteroids without awarding points", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 0, 24, 30, "large")];
  game.projectiles = [{ id: game.nextId++, owner: "saucer", x: 0, y: 24,
    velocityX: 0, velocityY: 0, age: 0 }];
  updateGame(game, 0.01, idle);
  assert.equal(game.score, 0);
  assert.equal(game.asteroids.length, 2);
  assert.ok(game.asteroids.every((a) => a.size === "medium"));
});

test("saucer shots destroy the ship and are consumed on contact", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 300, 200)];
  game.projectiles = [{ id: game.nextId++, owner: "saucer", x: 0, y: 0,
    velocityX: 0, velocityY: 0, age: 0 }];
  updateGame(game, 0.01, idle);
  assert.equal(game.lives, 2);
  assert.equal(game.ship.alive, false);
  assert.equal(game.projectiles.length, 0);
});

test("saucer shots do not damage an invulnerable ship", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 300, 200)];
  game.ship.invulnerable = 1;
  game.projectiles = [{ id: game.nextId++, owner: "saucer", x: 0, y: 0,
    velocityX: 0, velocityY: 0, age: 0 }];
  updateGame(game, 0.01, idle);
  assert.equal(game.lives, 3);
  assert.equal(game.ship.alive, true);
  assert.equal(game.projectiles.length, 0);
});

test("the ship loses at most one life in simultaneous contacts", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 0, 0), asteroid(game, 1, 0)];
  updateGame(game, 0.01, idle);
  assert.equal(game.lives, 2);
  assert.equal(game.ship.alive, false);
});

test("respawn waits two seconds, then remains blocked until the centre is safe", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 0, 0, 30)];
  updateGame(game, 0.01, idle);
  assert.equal(game.lives, 2);
  advance(game, 2);
  assert.equal(game.ship.alive, false);
  assert.equal(respawnIsWaiting(game), true);
  game.asteroids = [];
  updateGame(game, 0.01, idle);
  assert.equal(game.ship.alive, true);
  assert.equal(game.ship.invulnerable, 2);
});

test("hyperspace preserves heading, resets velocity, and enforces cooldown", () => {
  const game = makeGame();
  game.asteroids = [];
  game.ship.heading = 1.2;
  game.ship.velocityX = 30;
  game.ship.velocityY = -15;
  updateGame(game, 0, { ...idle, hyperspacePressed: true });
  assert.equal(game.ship.heading, 1.2);
  assert.equal(game.ship.velocityX, 0);
  assert.equal(game.ship.velocityY, 0);
  assert.equal(game.ship.hyperspaceCooldown, 5);
  const destination = [game.ship.x, game.ship.y];
  updateGame(game, 0, { ...idle, hyperspacePressed: true });
  assert.ok(Math.hypot(game.ship.x - destination[0], game.ship.y - destination[1]) < 1e-9);
});

test("hyperspace checks collisions at the random destination immediately", () => {
  const game = createGame(() => 0.5);
  startRun(game);
  game.asteroids = [asteroid(game, 0, 0, 30)];
  updateGame(game, 0, { ...idle, hyperspacePressed: true });
  assert.equal(game.ship.alive, false);
  assert.equal(game.lives, 2);
});

test("held fire respects its rate and four-shot limit", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 300, 200)];
  advance(game, 1, { ...idle, fire: true });
  assert.equal(game.projectiles.filter((shot) => shot.owner === "player").length, 4);
});

test("the last life enters game over after the explosion", () => {
  const game = makeGame();
  game.lives = 1;
  game.asteroids = [asteroid(game, 0, 0, 25)];
  updateGame(game, 0.01, idle);
  assert.equal(game.lives, 0);
  assert.equal(game.screen, "playing");
  advance(game, 0.8);
  assert.equal(game.screen, "gameover");
});

test("saucer appearance and firing follow their gameplay timers", () => {
  const game = makeGame();
  game.saucerSpawnIn = 0;
  updateGame(game, 0.01, idle);
  assert.ok(game.saucer);
  game.saucer.fireIn = 0;
  updateGame(game, 0.01, idle);
  assert.equal(game.projectiles.filter((shot) => shot.owner === "saucer").length, 1);
});

test("saucer contact does not wrap across a horizontal edge", () => {
  const game = makeGame();
  game.ship.x = -511;
  game.ship.y = 0;
  game.saucer = { id: game.nextId++, kind: "large", x: 511, y: 0,
    velocityX: 0, velocityY: 0, age: 0, turnIn: 10, fireIn: 10 };
  updateGame(game, 0, idle);
  assert.equal(game.ship.alive, true);
  assert.ok(game.saucer);
});

test("wave settings follow the formulas and cap indefinitely", () => {
  assert.equal(waveStartAsteroidCount(1), 4);
  assert.equal(waveStartAsteroidCount(99), 12);
  assert.equal(waveSpeedFactor(1), 1);
  assert.equal(waveSpeedFactor(99), 2);
  assert.equal(waveSaucerDelay(1), 20);
  assert.equal(waveSaucerDelay(99), 8);
  assert.equal(waveSmallSaucerChance(1), 0.1);
  assert.equal(waveSmallSaucerChance(99), 0.7);
  assert.equal(waveSaucerFireInterval(1), 2);
  assert.equal(waveSaucerFireInterval(99), 0.8);
});

test("keyboard discrete actions ignore repeat and held actions clear on blur", () => {
  const controller = new InputController();
  assert.equal(controller.keyDown("Enter", false), true);
  assert.equal(controller.read("title", []).startPressed, true);
  controller.keyDown("Enter", true);
  assert.equal(controller.read("title", []).startPressed, false);
  controller.keyDown("ArrowUp", false);
  assert.equal(controller.read("playing", []).thrust, true);
  controller.keyDown("Shift", false);
  assert.equal(controller.read("playing", []).hyperspacePressed, true);
  controller.keyDown("Shift", true);
  assert.equal(controller.read("playing", []).hyperspacePressed, false);
  controller.clear();
  assert.equal(controller.read("playing", []).thrust, false);
});

test("standard gamepad maps steering, thrust, fire, hyperspace and start edges", () => {
  const controller = new InputController();
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  const pad = { connected: true, axes: [0.4, -0.5], buttons };
  buttons[1].pressed = true;
  buttons[2].pressed = true;
  buttons[9].pressed = true;
  let frame = controller.read("title", [pad]);
  assert.equal(frame.turn, 0.4);
  assert.equal(frame.thrust, true);
  assert.equal(frame.fire, true);
  assert.equal(frame.hyperspacePressed, true);
  assert.equal(frame.startPressed, true);
  frame = controller.read("playing", [pad]);
  assert.equal(frame.pausePressed, false);
  buttons[9].pressed = false;
  controller.read("playing", [pad]);
  buttons[9].pressed = true;
  assert.equal(controller.read("playing", [pad]).pausePressed, true);
});

test("gamepad inputs held in settings stay blocked until release", () => {
  const controller = new InputController();
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  const pad = { connected: true, axes: [-0.7, -0.8], buttons };
  buttons[0].pressed = true;
  buttons[1].pressed = true;
  buttons[2].pressed = true;
  buttons[9].pressed = true;
  buttons[14].pressed = true;
  controller.suppressWhileModal([pad]);
  let frame = controller.read("paused", [pad]);
  assert.equal(frame.turn, 0);
  assert.equal(frame.thrust, false);
  assert.equal(frame.fire, false);
  assert.equal(frame.hyperspacePressed, false);
  assert.equal(frame.pausePressed, false);
  assert.equal(frame.startPressed, false);

  buttons.forEach((button) => { button.pressed = false; });
  pad.axes[0] = 0;
  pad.axes[1] = 0;
  controller.read("paused", [pad]);
  buttons[9].pressed = true;
  assert.equal(controller.read("paused", [pad]).pausePressed, true);
});

test("clearing settings keyboard state preserves gamepad edge history", () => {
  const controller = new InputController();
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  const pad = { connected: true, axes: [0, 0], buttons };
  buttons[9].pressed = true;
  assert.equal(controller.read("paused", [pad]).pausePressed, true);
  controller.keyDown("p", false);
  controller.clearKeyboard();
  assert.equal(controller.read("paused", [pad]).pausePressed, false);
  controller.keyDown("p", true);
  assert.equal(controller.read("paused", [pad]).pausePressed, false);
  controller.keyUp("p");
  controller.keyDown(" ", false);
  assert.equal(controller.read("playing", [pad]).fire, true);
  controller.clearKeyboard();
  controller.keyDown(" ", true);
  assert.equal(controller.read("playing", [pad]).fire, false);
  controller.keyUp(" ");
  controller.keyDown(" ", false);
  assert.equal(controller.read("playing", [pad]).fire, true);
});

test("high score persistence tolerates unavailable and failing storage", () => {
  assert.equal(readHighScore(() => { throw new Error("blocked"); }), 0);
  writeHighScore(() => { throw new Error("blocked"); }, 1200);
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(readHighScore(() => storage), 0);
  writeHighScore(() => storage, 4200);
  assert.equal(readHighScore(() => storage), 4200);
});

test("clearing a wave advances once after the intermission", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 0, 24, 18)];
  game.projectiles = [{ id: game.nextId++, owner: "player", x: 0, y: 24,
    velocityX: 0, velocityY: 0, age: 0 }];
  updateGame(game, 0.01, idle);
  assert.equal(game.screen, "intermission");
  assert.equal(game.wave, 1);
  advance(game, 1.99);
  assert.equal(game.wave, 1);
  updateGame(game, 0.02, idle);
  assert.equal(game.screen, "playing");
  assert.equal(game.wave, 2);
  assert.equal(game.asteroids.length, 5);
});

test("ship controls and firing remain active during intermission", () => {
  const game = makeGame();
  game.asteroids = [];
  game.screen = "intermission";
  game.intermission = 1;
  const x = game.ship.x;
  const heading = game.ship.heading;
  updateGame(game, 0.05, { ...idle, turn: 1, thrust: true, fire: true });
  assert.ok(game.ship.heading > heading);
  assert.ok(game.ship.x > x);
  assert.equal(game.thrusting, true);
  assert.equal(game.projectiles.filter((shot) => shot.owner === "player").length, 1);
  assert.ok(game.projectiles[0].age > 0);
  assert.equal(game.intermission, 0.95);
});

test("wave start clears player shots fired during intermission", () => {
  const game = makeGame();
  game.asteroids = [];
  game.screen = "intermission";
  game.intermission = 0.05;
  updateGame(game, 0.05, { ...idle, fire: true });
  assert.equal(game.wave, 2);
  assert.equal(game.projectiles.length, 0);
});

test("asteroid explosions continue animating during wave intermission", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 0, 24, 18)];
  game.projectiles = [{ id: game.nextId++, owner: "player", x: 0, y: 24,
    velocityX: 0, velocityY: 0, age: 0 }];
  updateGame(game, 0.01, idle);
  assert.equal(game.screen, "intermission");
  assert.equal(game.explosions.length, 1);
  updateGame(game, 0.1, idle);
  assert.ok(game.explosions[0].remaining < 0.35);
  advance(game, 0.3);
  assert.equal(game.explosions.length, 0);
  assert.equal(game.screen, "intermission");
});

test("wave progression continues after all difficulty caps are reached", () => {
  const game = makeGame();
  for (let wave = 1; wave <= 25; wave += 1) {
    game.asteroids = [];
    updateGame(game, 0.01, idle);
    assert.equal(game.screen, "intermission");
    advance(game, 2.01);
  }
  assert.equal(game.wave, 26);
  assert.equal(game.asteroids.length, 12);
  assert.equal(game.screen, "playing");
});
