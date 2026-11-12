import assert from "node:assert/strict";
import test from "node:test";
import { createGame, difficultyForScore, restartGame, updateGame } from "./game.ts";

const idle = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, restartPressed: false };
const thresholds = [0, 300, 1_000, 2_000, 4_000, 5_000, 6_000, 8_000, 10_000, 12_500, 15_000, 20_000];

function seeded(seed = 17) {
  let state = seed;
  return () => { state = (state * 16807) % 2147483647; return (state - 1) / 2147483646; };
}

function emptyGame() {
  const game = createGame(seeded());
  game.walls = [];
  game.player.x = 850;
  game.player.y = 500;
  game.robots = [{ id: 901, x: 200, y: 200, radius: 12, moveSpeed: 0, fireCooldown: 99 }];
  game.shots = [];
  return game;
}

function robot(game, x, y, options = {}) {
  return { id: game.nextId++, x, y, radius: 12, moveSpeed: 0, fireCooldown: 99, ...options };
}

function shot(game, owner, x, y, velocityX = 0, velocityY = 0) {
  return { id: game.nextId++, owner, x, y, velocityX, velocityY };
}

function crossExit(game, direction, { keepRobots = false } = {}) {
  const exit = {
    left: { x: 30, y: 300, moveX: -1, moveY: 0 },
    right: { x: 970, y: 300, moveX: 1, moveY: 0 },
    up: { x: 500, y: 30, moveX: 0, moveY: -1 },
    down: { x: 500, y: 570, moveX: 0, moveY: 1 },
  }[direction];
  if (keepRobots) {
    game.robots = game.robots.slice(0, 1).map((entry) => ({
      ...entry, x: 500, y: 500, moveSpeed: 0, fireCooldown: 99,
    }));
  } else {
    game.robots = [];
  }
  game.player.x = exit.x;
  game.player.y = exit.y;
  for (let i = 0; i < 24 && !game.transition; i += 1) {
    updateGame(game, 0.05, { ...idle, moveX: exit.moveX, moveY: exit.moveY });
  }
  assert.ok(game.transition, `entered next room through ${direction}`);
  const transition = game.transition;
  updateGame(game, game.transition.duration, idle);
  return transition;
}

test("every score threshold is inclusive and the preceding score stays in the prior tier", () => {
  assert.deepEqual(thresholds.map((score) => difficultyForScore(score).threshold), thresholds);
  for (let i = 1; i < thresholds.length; i += 1) {
    const threshold = thresholds[i];
    assert.equal(difficultyForScore(threshold - 1).threshold, thresholds[i - 1]);
    assert.equal(difficultyForScore(threshold).threshold, threshold);
  }
  assert.equal(difficultyForScore(1_000_000).threshold, 20_000);

  const expectedShots = [0, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 6];
  const expectedColors = ["dark yellow", "red", "dark cyan", "green", "dark purple", "light yellow",
    "white", "dark cyan", "light purple", "grey", "dark yellow", "red"];
  assert.deepEqual(thresholds.map((score) => difficultyForScore(score).shotLimit), expectedShots);
  assert.deepEqual(thresholds.map((score) => difficultyForScore(score).color), expectedColors);
  const slow = difficultyForScore(5_999).shotSpeed;
  const fast = difficultyForScore(6_000).shotSpeed;
  assert.ok(fast > slow);
  assert.ok(Math.abs(fast / slow - 1.28) < 0.03, "fast shots retain the specified starting ratio");
});

test("a run starts with zero score and six robots, and room entry selects the score tier", () => {
  const game = createGame(seeded());
  assert.equal(game.score, 0);
  assert.equal(game.roomEntryScore, 0);
  assert.equal(game.roomPopulation, 6);
  assert.equal(game.robots.length, 6);
  assert.equal(game.difficulty.threshold, 0);

  game.score = 6_000;
  crossExit(game, "right");
  assert.equal(game.difficulty.threshold, 6_000);
  assert.equal(game.roomEntryScore, 6_000);
  assert.equal(game.roomPopulation, 6, "a tier change resets population to six");
  assert.equal(game.robots.length, 6);
});

test("lives carry across room transitions and each new room starts firing amnesty", () => {
  const game = createGame(seeded(19));
  game.lives = 5;
  const transition = crossExit(game, "right", { keepRobots: true });
  assert.equal(game.lives, 5);
  assert.equal(transition.to.entrance, "left");
  assert.equal(game.fireAmnestyRemaining, 2);
});

test("tier zero blocks robot fire and a score threshold applies only on the next room entry", () => {
  const game = createGame(seeded(22));
  game.robots.forEach((entry) => { entry.fireCooldown = 0; });
  updateGame(game, 1 / 120, idle);
  assert.equal(game.difficulty.shotLimit, 0);
  assert.equal(game.shots.filter((entry) => entry.owner === "robot").length, 0);

  game.score = 300;
  assert.equal(game.difficulty.threshold, 0, "the current room keeps its selected tier");
  const transition = crossExit(game, "right");
  assert.equal(transition.from.difficulty.threshold, 0, "the outgoing room snapshot keeps its tier");
  assert.equal(transition.to.difficulty.threshold, 300);
  assert.equal(game.difficulty.threshold, 300);
});

test("each robot destruction cause awards 50 points and clearing the room adds 100 once", () => {
  const cases = [
    ["player shot", (game) => { game.shots = [shot(game, "player", 180, 200, 440, 0)]; }],
    ["robot shot", (game) => { game.shots = [shot(game, "robot", 200, 200)]; }],
    ["electrified wall", (game) => {
      game.robots[0].x = 150;
      game.robots[0].y = 200;
      game.walls = [{ x: 140, y: 180, width: 20, height: 40, electrified: true }];
    }],
    ["robot collision", (game) => { game.robots.push(robot(game, 224, 200)); }],
  ];

  for (const [cause, arrange] of cases) {
    const game = emptyGame();
    arrange(game);
    updateGame(game, 0.05, idle);
    assert.equal(game.robots.length, 0, `${cause} destroys the last robot`);
    const expectedScore = cause === "robot collision" ? 200 : 150;
    assert.equal(game.score, expectedScore, `${cause} awards 50 per robot plus the room-clear points`);
    updateGame(game, 0.05, idle);
    assert.equal(game.score, expectedScore, `${cause} cannot score the same clear twice`);
  }
});

test("uncleared exits carry score without a clear bonus; revisits populate fresh robots", () => {
  const game = createGame(seeded(31));
  game.score = 250;
  const startingRobots = [...game.robots];
  const transition = crossExit(game, "right", { keepRobots: true });
  assert.equal(game.score, 250);
  assert.equal(transition.from.robots.length, 1, "the player may leave with a robot still alive");
  assert.equal(game.roomEntryScore, 250);
  assert.equal(game.roomPopulation, 6);
  assert.equal(game.difficulty.threshold, 0);
  assert.equal(game.robots.length, 6);

  game.score = 300;
  crossExit(game, "up");
  crossExit(game, "left");
  crossExit(game, "down");
  assert.deepEqual([game.roomX, game.roomY], [0, 0], "the loop returns to the earlier room coordinate");
  assert.equal(game.roomEntryScore, 300);
  assert.equal(game.difficulty.threshold, 300);
  assert.equal(game.roomPopulation, 6, "a tier change resets the population");
  assert.equal(game.robots.length, 6);
  assert.ok(game.robots.every((entry) => !startingRobots.includes(entry)), "room entry repopulates rather than restoring old actors");
});

test("robot shots share the room cap and use the selected tier speed", () => {
  const game = createGame(seeded(44));
  game.score = 300;
  crossExit(game, "right");
  game.walls = [];
  game.player.x = 500;
  game.player.y = 100;
  game.robots = [
    robot(game, 100, 100, { fireCooldown: 0 }),
    robot(game, 300, 100, { fireCooldown: 0 }),
    robot(game, 700, 100, { fireCooldown: 0 }),
  ];
  game.fireAmnestyRemaining = 0;

  updateGame(game, 0.02, idle);
  const enemyShots = () => game.shots.filter((entry) => entry.owner === "robot");
  assert.equal(enemyShots().length, 1, "the cap applies across all robots");
  assert.equal(Math.round(Math.hypot(enemyShots()[0].velocityX, enemyShots()[0].velocityY)),
    Math.round(game.difficulty.shotSpeed));

  game.shots = [shot(game, "robot", 999, 500, 500, 0)];
  game.robots.forEach((entry) => { entry.fireCooldown = 0; });
  updateGame(game, 1 / 120, idle);
  assert.equal(enemyShots().length, 0, "the existing projectile leaves the room");
  game.robots.forEach((entry) => { entry.fireCooldown = 0; });
  updateGame(game, 1 / 120, idle);
  assert.equal(enemyShots().length, 1, "a robot may fire again after its existing shot disappears");
});

test("robot population grows by three only when score changes within a noninitial tier", () => {
  const game = createGame(seeded(66));
  game.score = 1_000;
  crossExit(game, "right");
  assert.equal(game.roomPopulation, 6);
  game.score = 1_050;
  crossExit(game, "up");
  assert.equal(game.roomPopulation, 9);
  assert.equal(game.robots.length, 9);
  game.score = 1_050;
  crossExit(game, "left");
  assert.equal(game.roomPopulation, 9, "unchanged score retains the population");
  game.score = 1_100;
  crossExit(game, "down");
  assert.equal(game.roomPopulation, 12);
  game.score = 1_150;
  crossExit(game, "right");
  assert.equal(game.roomPopulation, 12, "population caps at twelve");
});

test("restart resets score, difficulty and population for a fresh run", () => {
  const game = createGame(seeded(83));
  game.score = 5_000;
  crossExit(game, "right");
  game.score = 5_050;
  crossExit(game, "up");
  assert.equal(game.roomPopulation, 9);
  restartGame(game);
  assert.equal(game.score, 0);
  assert.equal(game.roomEntryScore, 0);
  assert.equal(game.difficulty.threshold, 0);
  assert.equal(game.roomPopulation, 6);
  assert.equal(game.robots.length, 6);
  assert.equal(game.shots.length, 0);
});

test("twelve-robot rooms spawn safely for all entrances across varied run seeds", () => {
  const route = ["right", "up", "left", "down", "right", "up"];
  for (let seed = 1; seed <= 12; seed += 1) {
    const game = createGame(seeded(seed));
    game.score = 1_000;
    const testedEntrances = new Set();
    for (let room = 0; room < route.length; room += 1) {
      if (room < 3) game.score = 1_000 + room;
      crossExit(game, route[room]);
      if (game.roomPopulation === 12) {
        testedEntrances.add(game.entrance);
        assert.equal(game.robots.length, 12);
        const actors = [game.player, ...game.robots];
        for (const [index, actor] of actors.entries()) {
          for (const wall of game.walls) {
            const x = Math.max(wall.x, Math.min(actor.x, wall.x + wall.width));
            const y = Math.max(wall.y, Math.min(actor.y, wall.y + wall.height));
            assert.ok(Math.hypot(actor.x - x, actor.y - y) > actor.radius + 10,
              `seed ${seed} entrance ${game.entrance}: actor is clear of walls`);
          }
          for (const other of actors.slice(index + 1)) {
            assert.ok(Math.hypot(actor.x - other.x, actor.y - other.y) > actor.radius + other.radius + 50,
              `seed ${seed} entrance ${game.entrance}: actors have safe spacing`);
          }
        }
      }
    }
    assert.deepEqual([...testedEntrances].sort(), ["down", "left", "right", "up"]);
  }
});
