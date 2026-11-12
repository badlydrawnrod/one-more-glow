import assert from "node:assert/strict";
import test from "node:test";
import { createGame, difficultyForScore, restartGame, ROOM, updateGame } from "./game.ts";

const idle = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, restartPressed: false };

function seedRandom(seed) {
  let state = seed;
  return () => { state = (state * 16807) % 2147483647; return (state - 1) / 2147483646; };
}

function advance(game, seconds, input = idle) {
  const ticks = Math.ceil(seconds / 0.1);
  for (let i = 0; i < ticks; i += 1) updateGame(game, Math.min(0.1, seconds - i * 0.1), input);
}

function robot(game, x, y, options = {}) {
  return { id: game.nextId++, x, y, spawnX: x, spawnY: y, radius: 12, moveSpeed: 0, fireCooldown: 99, ...options };
}

function shot(game, owner, x, y, velocityX = 0, velocityY = 0) {
  return { id: game.nextId++, owner, x, y, velocityX, velocityY };
}

function travel(game, direction) {
  const exit = {
    left: { x: 30, y: 300, moveX: -1, moveY: 0 },
    right: { x: 970, y: 300, moveX: 1, moveY: 0 },
    up: { x: 500, y: 30, moveX: 0, moveY: -1 },
    down: { x: 500, y: 570, moveX: 0, moveY: 1 },
  }[direction];
  game.player.x = exit.x;
  game.player.y = exit.y;
  for (let i = 0; i < 24 && !game.transition; i += 1) {
    updateGame(game, 0.05, { ...idle, moveX: exit.moveX, moveY: exit.moveY });
  }
  assert.ok(game.transition, `transition starts through ${direction}`);
}

function finishTransition(game) {
  updateGame(game, game.transition.duration, idle);
  assert.equal(game.transition, null);
}

test("Captain lurk duration is fixed from the population when placed", () => {
  const game = createGame(seedRandom(301));
  assert.equal(game.robots.length, 6);
  assert.equal(game.captain.state, "lurking");
  assert.equal(game.captain.lurkTimeRemaining, 9);

  // Clearing the room after placement does not shorten the timer.
  game.robots = [];
  advance(game, 8.9);
  assert.equal(game.captain.state, "lurking");
  assert.ok(game.captain.lurkTimeRemaining > 0 && game.captain.lurkTimeRemaining < 0.11);
  advance(game, 0.1);
  assert.equal(game.captain.state, "chasing");
  assert.equal(game.captain.lurkTimeRemaining, 0);
});

test("room placement sets lurk time from the six, nine or twelve robot population", () => {
  for (const population of [6, 9, 12]) {
    const game = createGame(seedRandom(310 + population));
    // Arrange an eligible established tier and population so normal room entry
    // constructs a fresh Captain with that room's population.
    game.score = 300;
    game.roomEntryScore = 300;
    game.difficulty = difficultyForScore(300);
    game.roomPopulation = population;
    game.robots = [];
    travel(game, "right");
    assert.equal(game.transition.to.robots.length, population);
    assert.equal(game.transition.to.captain.lurkTimeRemaining, population * 1.5);
    assert.equal(game.captain.lurkTimeRemaining, population * 1.5);
    finishTransition(game);
  }
});

test("Captain is placed outside each closed entrance and room snapshots own their state", () => {
  const game = createGame(seedRandom(322));
  assert.ok(game.captain.x < 0, "initial entrance is on the left");
  const cases = [["right", "left"], ["up", "down"], ["left", "right"], ["down", "up"]];
  for (const [exit, entrance] of cases) {
    travel(game, exit);
    const oldCaptain = game.transition.from.captain;
    const incoming = game.transition.to.captain;
    assert.equal(game.transition.to.entrance, entrance);
    assert.notStrictEqual(oldCaptain, incoming);
    assert.notStrictEqual(incoming, game.captain);
    if (entrance === "left") assert.ok(incoming.x < 0);
    if (entrance === "right") assert.ok(incoming.x > ROOM.width);
    if (entrance === "up") assert.ok(incoming.y < 0);
    if (entrance === "down") assert.ok(incoming.y > ROOM.height);
    assert.equal(incoming.state, "lurking");
    finishTransition(game);
  }
});

test("Captain timer and motion pause during transitions, then reset for the next room", () => {
  const game = createGame(seedRandom(333));
  game.robots = [];
  advance(game, 3);
  travel(game, "right");
  const outgoing = { ...game.transition.from.captain };
  const incoming = { ...game.captain };
  updateGame(game, game.transition.duration / 2, idle);
  assert.deepEqual(game.captain, incoming);
  assert.deepEqual(game.transition.from.captain, outgoing);
  finishTransition(game);
  assert.equal(game.captain.state, "lurking");
  assert.equal(game.captain.lurkTimeRemaining, 9);
});

test("Captain continues through a death interval and resets from surviving robots at respawn", () => {
  const game = createGame(seedRandom(344));
  game.robots = [robot(game, 700, 500), robot(game, 800, 500), robot(game, 900, 500)];
  game.player.x = 100;
  game.player.y = 100;
  game.captain.x = 400;
  game.captain.y = 100;
  game.captain.state = "chasing";
  game.shots = [shot(game, "robot", game.player.x, game.player.y)];
  updateGame(game, 0.05, idle);
  assert.equal(game.outcome, "dying");
  const startX = game.captain.x;
  advance(game, 1.95);
  assert.notEqual(game.captain.x, startX, "Captain keeps moving during death");
  updateGame(game, 0.05, idle);
  assert.equal(game.outcome, "playing");
  assert.equal(game.captain.state, "lurking");
  assert.ok(game.captain.lurkTimeRemaining <= 4.5 && game.captain.lurkTimeRemaining > 4.3,
    "respawn starts a 4.5-second lurk, with only active simulation time elapsed afterward");

  game.robots = [];
  game.captain.state = "chasing";
  game.shots = [shot(game, "robot", game.player.x, game.player.y)];
  updateGame(game, 0.02, idle);
  advance(game, 2);
  assert.equal(game.outcome, "playing");
  assert.ok(Math.abs(game.captain.lurkTimeRemaining - 2) < 0.01, "an empty room gets the two-second minimum");

  game.captain.state = "chasing";
  game.score = 12_000;
  restartGame(game);
  assert.equal(game.captain.state, "lurking");
  assert.equal(game.captain.lurkTimeRemaining, 9);
  assert.equal(game.score, 0);
});

test("Captain pursues through walls", () => {
  const game = createGame(seedRandom(355));
  game.robots = [];
  game.walls = [{ x: 240, y: 20, width: 20, height: 560, electrified: true }];
  game.player.x = 500;
  game.player.y = 100;
  game.captain.state = "chasing";
  game.captain.lurkTimeRemaining = 0;
  game.captain.x = 200;
  game.captain.y = 100;
  advance(game, 1.2);
  assert.ok(game.captain.x > 260, "Captain passed through the partition");
  assert.equal(game.captain.state, "chasing");
});

test("player and robot shots are consumed by the Captain without stopping or scoring", () => {
  const game = createGame(seedRandom(356));
  game.walls = [];
  game.robots = [];
  game.player.x = 900;
  game.player.y = 500;
  game.captain.state = "chasing";
  game.captain.lurkTimeRemaining = 0;
  game.captain.x = 400;
  game.captain.y = 100;
  game.shots = [shot(game, "player", 350, 100, 440, 0), shot(game, "robot", 450, 100, -235, 0)];
  const score = game.score;
  advance(game, 0.1);
  assert.ok(game.captain.x > 400, "Captain keeps pursuing after projectile hits");
  assert.equal(game.shots.length, 0, "both projectile types are consumed on contact");
  assert.equal(game.score, score);
});

test("Captain contact destroys robots for normal score and kills the player once", () => {
  const game = createGame(seedRandom(366));
  game.walls = [];
  game.player.x = 900;
  game.player.y = 500;
  game.robots = [robot(game, 300, 300)];
  game.captain.state = "chasing";
  game.captain.lurkTimeRemaining = 0;
  game.captain.x = 300;
  game.captain.y = 300;
  updateGame(game, 0.01, idle);
  assert.equal(game.robots.length, 0);
  assert.equal(game.score, 150, "robot destruction and the room-clear bonus use regular scoring");
  assert.equal(game.captain.state, "chasing");

  game.player.x = game.captain.x;
  game.player.y = game.captain.y;
  updateGame(game, 0.01, idle);
  assert.equal(game.outcome, "dying");
  assert.equal(game.lives, 2);
  updateGame(game, 0.05, idle);
  assert.equal(game.lives, 2, "continued overlap cannot charge another life");
});

test("Captain contact and robot-to-robot collision resolve together without duplicate score", () => {
  const game = createGame(seedRandom(377));
  game.walls = [];
  game.player.x = 900;
  game.player.y = 500;
  game.captain.state = "chasing";
  game.captain.lurkTimeRemaining = 0;
  game.captain.x = 300;
  game.captain.y = 300;
  game.robots = [robot(game, 330, 300), robot(game, 354, 300)];
  updateGame(game, 0.01, idle);
  assert.equal(game.robots.length, 0, "Captain contact and robot contact destroy the full pair");
  assert.equal(game.score, 200, "both robots score once and the room bonus scores once");
});

