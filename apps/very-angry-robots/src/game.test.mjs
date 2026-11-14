import assert from "node:assert/strict";
import test from "node:test";
import { createGame, difficultyForScore, restartGame, updateGame, ROOM_SCROLL_DURATION } from "./game.ts";

const idle = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, restartPressed: false };

function emptyGame() {
  const game = createGame();
  game.walls = [];
  game.robots = [{ id: 999, x: 700, y: 500, radius: 12, moveSpeed: 0, fireCooldown: 99 }];
  game.shots = [];
  game.player.x = 100;
  game.player.y = 100;
  return game;
}

function robot(game, x, y, options = {}) {
  return { id: game.nextId++, x, y, radius: 12, moveSpeed: 0, fireCooldown: 99, ...options };
}

function shot(game, owner, x, y, velocityX = 0, velocityY = 0) {
  return { id: game.nextId++, owner, x, y, velocityX, velocityY };
}

test("generated rooms start actors clear of walls and one another", () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    let state = seed;
    const random = () => { state = (state * 16807) % 2147483647; return (state - 1) / 2147483646; };
    const game = createGame(random);
    const actors = [game.player, ...game.robots];
    for (const [index, actor] of actors.entries()) {
      for (const wall of game.walls) {
        const x = Math.max(wall.x, Math.min(actor.x, wall.x + wall.width));
        const y = Math.max(wall.y, Math.min(actor.y, wall.y + wall.height));
        assert.ok(Math.hypot(actor.x - x, actor.y - y) > actor.radius + 10);
      }
      for (const other of actors.slice(index + 1)) {
        assert.ok(Math.hypot(actor.x - other.x, actor.y - other.y) > actor.radius + other.radius + 50);
      }
    }
  }
});

function seedRandom(seed) {
  let state = seed;
  return () => { state = (state * 16807) % 2147483647; return (state - 1) / 2147483646; };
}

function travel(game, direction) {
  const toward = {
    left: { x: 30, y: 300, moveX: -1, moveY: 0 },
    right: { x: 970, y: 300, moveX: 1, moveY: 0 },
    up: { x: 500, y: 30, moveX: 0, moveY: -1 },
    down: { x: 500, y: 570, moveX: 0, moveY: 1 },
  }[direction];
  game.player.x = toward.x;
  game.player.y = toward.y;
  for (let i = 0; i < 24 && !game.transition; i += 1) {
    updateGame(game, 0.05, { ...idle, moveX: toward.moveX, moveY: toward.moveY });
  }
  assert.ok(game.transition, `transition starts through ${direction}`);
  assert.equal(game.transition.direction, direction);
}

function finishTransition(game) {
  updateGame(game, game.transition.duration, { ...idle, moveX: 1, fire: true, aimX: 1 });
  assert.equal(game.transition, null);
}

test("open exits transition in all four directions and repopulate safely", () => {
  const game = createGame(seedRandom(42));
  travel(game, "right");
  assert.deepEqual([game.roomX, game.roomY, game.entrance], [1, 0, "left"]);
  assert.equal(game.robots.length, 6);
  assert.equal(game.shots.length, 0);
  assert.ok(game.player.x < 200);
  finishTransition(game);
  travel(game, "up");
  assert.deepEqual([game.roomX, game.roomY, game.entrance], [1, -1, "down"]);
  finishTransition(game);
  travel(game, "left");
  assert.deepEqual([game.roomX, game.roomY, game.entrance], [0, -1, "right"]);
  finishTransition(game);
  travel(game, "down");
  assert.deepEqual([game.roomX, game.roomY, game.entrance], [0, 0, "up"]);
  finishTransition(game);
  assert.equal(game.outcome, "playing");
});

test("coordinate revisits reproduce maze but repopulate actors for the return entrance", () => {
  const game = createGame(seedRandom(91));
  const initialMazeWalls = game.walls.slice(0, -game.geometry.hazardRects.length).map((wall) => ({ ...wall }));
  game.shots = [shot(game, "player", 120, 120)];
  travel(game, "right"); finishTransition(game);
  travel(game, "up"); finishTransition(game);
  travel(game, "left"); finishTransition(game);
  travel(game, "down");
  assert.deepEqual([game.roomX, game.roomY, game.entrance], [0, 0, "up"]);
  assert.deepEqual(game.walls.slice(0, initialMazeWalls.length), initialMazeWalls);
  assert.equal(game.robots.length, 6);
  assert.equal(game.shots.length, 0);
});

test("transition pauses movement and combat until the new room is in place", () => {
  const game = createGame(seedRandom(17));
  travel(game, "right");
  const elapsed = game.elapsed;
  const amnesty = game.fireAmnestyRemaining;
  const player = { ...game.player };
  const robotState = game.robots.map((robot) => ({ ...robot }));
  updateGame(game, game.transition.duration / 2, { ...idle, moveX: 1, aimX: 1, fire: true });
  assert.equal(game.elapsed, elapsed);
  assert.equal(game.fireAmnestyRemaining, amnesty);
  assert.deepEqual(game.player, player);
  assert.deepEqual(game.robots, robotState);
  assert.equal(game.shots.length, 0);
  assert.ok(game.transition.progress > 0 && game.transition.progress < 1);
  updateGame(game, ROOM_SCROLL_DURATION - game.transition.duration / 2 + 0.05,
    { ...idle, moveX: 1, aimX: 1, fire: true });
  assert.ok(game.transition, "gameplay remains paused while the entrance closes");
  assert.deepEqual(game.player, player);
  assert.equal(game.shots.length, 0);
  finishTransition(game);
  assert.equal(game.elapsed, 0);
  assert.equal(game.fireAmnestyRemaining, 2);
});

test("audio events are emitted only for resolved shots, room transitions, and respawns", () => {
  const firing = emptyGame();
  const shotEvents = updateGame(firing, 0.01, { ...idle, aimX: 1, fire: true });
  assert.equal(shotEvents.filter((event) => event.type === "player-shot").length, 1);
  assert.equal(updateGame(firing, 0.01, { ...idle, aimX: 1, fire: true })
    .some((event) => event.type === "player-shot"), false, "cooldown prevents a second shot event");

  const robotsFiring = emptyGame();
  robotsFiring.fireAmnestyRemaining = 0;
  robotsFiring.difficulty = difficultyForScore(300);
  robotsFiring.robots = [robot(robotsFiring, 300, 100, { fireCooldown: 0 })];
  assert.equal(updateGame(robotsFiring, 0.01, idle).filter((event) => event.type === "robot-shot").length, 1);

  const travelling = createGame(seedRandom(73));
  const started = [];
  travelling.player.x = 970;
  travelling.player.y = 300;
  for (let i = 0; i < 24 && !travelling.transition; i += 1) started.push(...updateGame(travelling, 0.05, { ...idle, moveX: 1 }));
  assert.equal(started.some((event) => event.type === "room-retreated"), true);
  assert.equal(started.some((event) => event.type === "room-entered"), false);
  const halfway = updateGame(travelling, travelling.transition.duration / 2);
  assert.equal(halfway.some((event) => event.type === "room-entered"), false);
  const entered = updateGame(travelling, travelling.transition.duration);
  assert.deepEqual(entered.filter((event) => event.type === "room-entered").map(({ roomX, roomY }) => [roomX, roomY]), [[1, 0]]);

  const respawning = createGame();
  respawning.outcome = "dying";
  respawning.deathTimeRemaining = 0.01;
  const respawnEvents = updateGame(respawning, 0.02);
  assert.equal(respawnEvents.filter((event) => event.type === "player-respawned").length, 1);

  const captain = emptyGame();
  captain.captain.lurkTimeRemaining = 0.01;
  assert.equal(updateGame(captain, 0.02).filter((event) => event.type === "captain-entered").length, 1);
  assert.equal(updateGame(captain, 0.02).some((event) => event.type === "captain-entered"), false);
});

test("hazard, room-clear, and extra-life cues accompany their resolved outcomes once", () => {
  const player = emptyGame();
  player.walls = [{ x: 120, y: 80, width: 20, height: 40, electrified: true }];
  const playerEvents = updateGame(player, 0.1, { ...idle, moveX: 1 });
  assert.equal(playerEvents.filter((event) => event.type === "player-hazard").length, 1);
  assert.equal(playerEvents.filter((event) => event.type === "player-defeated").length, 1);

  const robots = emptyGame();
  robots.player.x = 700;
  robots.player.y = 500;
  robots.walls = [{ x: 120, y: 80, width: 20, height: 40, electrified: true }];
  robots.robots = [robot(robots, 100, 100, { moveSpeed: 100 })];
  let robotHazardCount = 0;
  for (let i = 0; i < 20; i += 1) robotHazardCount += updateGame(robots, 0.1).filter((event) => event.type === "robot-hazard").length;
  assert.equal(robotHazardCount, 1);

  const clear = emptyGame();
  clear.score = 9_950;
  clear.robots = [robot(clear, 140, 100)];
  clear.shots = [shot(clear, "player", 120, 100, 440, 0)];
  const clearEvents = updateGame(clear, 0.05);
  assert.equal(clearEvents.filter((event) => event.type === "room-cleared").length, 1);
  assert.equal(clearEvents.filter((event) => event.type === "extra-life").length, 1);
});

test("closed entrance and doorway jambs remain hazardous while open gaps are traversable", () => {
  const closed = createGame(seedRandom(52));
  closed.player.x = 30;
  closed.player.y = 300;
  for (let i = 0; i < 20 && closed.outcome === "playing"; i += 1) {
    updateGame(closed, 0.05, { ...idle, moveX: -1 });
  }
  assert.equal(closed.outcome, "dying");
  assert.equal(closed.transition, null);

  const jamb = createGame(seedRandom(53));
  jamb.player.x = 970;
  jamb.player.y = 253;
  updateGame(jamb, 0.05, { ...idle, moveX: 1 });
  assert.equal(jamb.outcome, "dying");
  assert.equal(jamb.transition, null);

  const doorway = createGame(seedRandom(54));
  travel(doorway, "right");
  assert.equal(doorway.transition.direction, "right");

  const jambClearance = createGame(seedRandom(55));
  jambClearance.player.x = 970;
  jambClearance.player.y = 260; // 40px from the doorway center, clear of the jamb rectangles.
  for (let i = 0; i < 20 && !jambClearance.transition && jambClearance.outcome === "playing"; i += 1) {
    updateGame(jambClearance, 0.05, { ...idle, moveX: 1 });
  }
  assert.ok(jambClearance.transition);

  const jambContact = createGame(seedRandom(56));
  jambContact.player.x = 970;
  jambContact.player.y = 257; // 43px from center; the circle contacts the top jamb.
  for (let i = 0; i < 20 && jambContact.outcome === "playing"; i += 1) {
    updateGame(jambContact, 0.05, { ...idle, moveX: 1 });
  }
  assert.equal(jambContact.outcome, "dying");
  assert.equal(jambContact.transition, null);
});

test("shots vanish at the room edge and robots cannot enter an adjacent room", () => {
  const game = emptyGame();
  game.player.x = 500;
  game.player.y = 500;
  game.shots = [shot(game, "player", 990, 300, 440, 0)];
  updateGame(game, 0.05, idle);
  assert.equal(game.shots.length, 0);

  const robot = { ...game.robots[0], x: 970, y: 300, moveSpeed: 500 };
  game.robots = [robot];
  game.player.x = 999;
  game.player.y = 300;
  updateGame(game, 0.05, idle);
  assert.ok(robot.x <= 1000);
  assert.equal(game.transition, null);
});

test("movement is normalized diagonally and aiming does not steer movement", () => {
  const game = emptyGame();
  updateGame(game, 0.1, { ...idle, moveX: 1, moveY: 1, aimX: -1, aimY: 0 });
  assert.ok(Math.abs(game.player.x - (100 + 190 / Math.sqrt(2) * 0.1)) < 0.02);
  assert.ok(Math.abs(game.player.y - (100 + 190 / Math.sqrt(2) * 0.1)) < 0.02);
});

test("held fire repeats on its rate limit, and release stops new shots", () => {
  const game = emptyGame();
  updateGame(game, 0.1, { ...idle, aimX: 1, fire: true });
  assert.equal(game.shots.length, 1);
  for (let i = 0; i < 6; i += 1) updateGame(game, 0.1, { ...idle, aimX: 1, fire: true });
  assert.equal(game.shots.length, 3);
  for (let i = 0; i < 5; i += 1) updateGame(game, 0.1, idle);
  assert.equal(game.shots.length, 3);
});

test("player projectile destroys one robot and is consumed", () => {
  const game = emptyGame();
  game.robots = [robot(game, 145, 100), robot(game, 145, 100)];
  game.shots = [shot(game, "player", 130, 100, 440, 0)];
  updateGame(game, 0.05, idle);
  assert.equal(game.robots.length, 1);
  assert.equal(game.shots.length, 0);
  assert.equal(game.outcome, "playing");
});

test("shots disappear at walls and walls block robot line of sight", () => {
  const game = emptyGame();
  game.player.x = 200;
  game.player.y = 100;
  game.walls = [{ x: 130, y: 70, width: 20, height: 60, electrified: false }];
  game.robots = [robot(game, 100, 100, { fireCooldown: 0 })];
  game.shots = [shot(game, "player", 120, 100, 440, 0)];
  updateGame(game, 0.08, idle);
  assert.equal(game.robots.length, 1);
  assert.equal(game.shots.filter((projectile) => projectile.owner === "player").length, 0);
  assert.equal(game.shots.filter((projectile) => projectile.owner === "robot").length, 0);
});

test("robots pursue, route around a partition, and do not cross it", () => {
  const game = emptyGame();
  game.player.x = 300;
  game.player.y = 100;
  game.walls = [{ x: 180, y: 40, width: 20, height: 120, electrified: false }];
  const pursuer = robot(game, 100, 100, { moveSpeed: 80 });
  game.robots = [pursuer];
  let wentAround = false;
  for (let i = 0; i < 80; i += 1) {
    updateGame(game, 0.05, idle);
    if (pursuer.x >= 150 && pursuer.x <= 220 && pursuer.y > 172) wentAround = true;
  }
  assert.ok(pursuer.x > 200, "robot found a path around the partition");
  assert.ok(wentAround, "robot went around an end of the partition");
});

test("robot fires only with line of sight and its projectile can defeat the player", () => {
  const blocked = emptyGame();
  blocked.player.x = 200;
  blocked.player.y = 100;
  blocked.walls = [{ x: 140, y: 70, width: 20, height: 60, electrified: false }];
  blocked.robots = [robot(blocked, 100, 100, { fireCooldown: 0 })];
  updateGame(blocked, 0.02, idle);
  assert.equal(blocked.shots.length, 0);

  const clear = emptyGame();
  clear.difficulty = difficultyForScore(300);
  clear.fireAmnestyRemaining = 0;
  clear.player.x = 200;
  clear.player.y = 100;
  clear.robots = [robot(clear, 100, 100, { fireCooldown: 0 })];
  updateGame(clear, 0.02, idle);
  assert.equal(clear.shots[0].owner, "robot");
  clear.player.x = clear.shots[0].x + 10;
  clear.player.y = clear.shots[0].y;
  clear.shots[0].velocityX = clear.difficulty.shotSpeed;
  clear.shots[0].velocityY = 0;
  updateGame(clear, 0.02, idle);
  assert.equal(clear.outcome, "dying");
});

test("a robot shot can destroy a different robot and robot contact destroys both", () => {
  const game = emptyGame();
  game.robots = [robot(game, 300, 300), robot(game, 340, 300)];
  game.shots = [shot(game, "robot", 330, 300)];
  updateGame(game, 0.01, idle);
  assert.equal(game.robots.length, 1);

  game.robots = [robot(game, 300, 300), robot(game, 324, 300)];
  updateGame(game, 0.01, idle);
  assert.equal(game.robots.length, 0);
});

test("electrified wall and room edge contact start a death interval; robots still die to hazards", () => {
  const game = emptyGame();
  game.walls = [{ x: 120, y: 80, width: 20, height: 40, electrified: true }];
  updateGame(game, 0.1, { ...idle, moveX: 1 });
  assert.equal(game.outcome, "dying");

  const edge = emptyGame();
  edge.player.x = 20;
  updateGame(edge, 0.1, { ...idle, moveX: -1 });
  assert.equal(edge.outcome, "dying");

  const robotGame = emptyGame();
  robotGame.player.x = 700;
  robotGame.player.y = 500;
  robotGame.walls = [{ x: 120, y: 80, width: 20, height: 40, electrified: true }];
  robotGame.robots = [robot(robotGame, 100, 100, { moveSpeed: 100 })];
  for (let i = 0; i < 20; i += 1) updateGame(robotGame, 0.1, idle);
  assert.equal(robotGame.robots.length, 0);
  assert.equal(robotGame.outcome, "playing");
});

test("player death is recorded when the final robot is destroyed in the same update", () => {
  const game = emptyGame();
  game.robots = [robot(game, 140, 100)];
  game.shots = [shot(game, "player", 120, 100, 440, 0), shot(game, "robot", 100, 100)];
  updateGame(game, 0.05, idle);
  assert.equal(game.robots.length, 0);
  assert.equal(game.score, 150, "the final robot and room-clear bonus still score during player death");
  assert.equal(game.outcome, "dying");
});

function advance(game, seconds) {
  const ticks = Math.ceil(seconds / 0.1);
  for (let i = 0; i < ticks; i += 1) updateGame(game, Math.min(0.1, seconds - i * 0.1), idle);
}

test("runs start with three lives and robot firing amnesty after room entry", () => {
  const game = createGame(seedRandom(61));
  assert.equal(game.lives, 3);
  assert.equal(game.outcome, "playing");
  assert.equal(game.fireAmnestyRemaining, 2);

  game.walls = [];
  game.player.x = 500;
  game.player.y = 100;
  game.difficulty = difficultyForScore(300);
  game.robots = [robot(game, 100, 100, { fireCooldown: 0 })];
  updateGame(game, 1, idle);
  assert.equal(game.shots.filter((entry) => entry.owner === "robot").length, 0);
  assert.ok(game.fireAmnestyRemaining > 1.8 && game.fireAmnestyRemaining < 2);
  advance(game, 2);
  assert.equal(game.shots.filter((entry) => entry.owner === "robot").length, 1);
});

test("each lethal hazard starts one two-second death interval despite simultaneous hits", () => {
  const cases = [
    ["robot projectile", (game) => { game.shots = [shot(game, "robot", 100, 100)]; }],
    ["robot contact", (game) => { game.robots = [robot(game, 100, 100)]; }],
    ["electrified wall", (game) => { game.walls = [{ x: 90, y: 80, width: 20, height: 40, electrified: true }]; }],
    ["room edge", (game) => { game.player.x = 10; }],
    ["multiple simultaneous hazards", (game) => {
      game.robots = [robot(game, 100, 100), robot(game, 100, 100)];
      game.shots = [shot(game, "robot", 100, 100), shot(game, "robot", 100, 100)];
    }],
  ];

  for (const [cause, arrange] of cases) {
    const game = emptyGame();
    game.fireAmnestyRemaining = 0;
    game.robots = [];
    arrange(game);
    updateGame(game, 0.02, idle);
    assert.equal(game.outcome, "dying", cause);
    assert.ok(game.deathTimeRemaining > 1.9 && game.deathTimeRemaining <= 2, cause);
    assert.equal(game.lives, 2, "each death consumes one life immediately");
    const position = { x: game.player.x, y: game.player.y };
    const shots = game.shots.length;
    updateGame(game, 0.5, { ...idle, moveX: 1, aimX: 1, fire: true });
    assert.deepEqual({ x: game.player.x, y: game.player.y }, position, cause);
    assert.equal(game.shots.length, shots, cause);
    assert.ok(game.deathTimeRemaining < 1.91 && game.deathTimeRemaining > 1.8, cause);
  }
});

test("death interval keeps combat and scoring active, then respawns surviving actors", () => {
  const game = emptyGame();
  game.walls = [];
  game.player.x = 100;
  game.player.y = 100;
  game.player.spawnX = 100;
  game.player.spawnY = 100;
  game.robots = [
    robot(game, 300, 300, { spawnX: 300, spawnY: 300 }),
    robot(game, 200, 200, { spawnX: 200, spawnY: 200 }),
  ];
  game.shots = [shot(game, "robot", 100, 100), shot(game, "player", 190, 200, 0, 0)];
  updateGame(game, 0.01, idle);
  assert.equal(game.outcome, "dying");
  assert.equal(game.score, 50);
  assert.equal(game.robots.length, 1, "a destroyed robot stays destroyed");
  advance(game, 1.99);
  assert.equal(game.outcome, "dying");
  updateGame(game, 0.02, idle);
  assert.equal(game.outcome, "playing");
  assert.equal(game.lives, 2);
  assert.deepEqual([game.player.x, game.player.y], [100, 100]);
  assert.deepEqual([game.robots[0].x, game.robots[0].y], [300, 300]);
  assert.equal(game.robots.length, 1);
  assert.equal(game.shots.length, 0);
  assert.equal(game.score, 50);
  assert.ok(game.fireAmnestyRemaining > 1.9 && game.fireAmnestyRemaining <= 2);
});

test("score thresholds award extra lives once, including while dying", () => {
  const game = emptyGame();
  game.lives = 1;
  game.score = 9_950;
  game.walls = [];
  game.robots = [robot(game, 200, 200)];
  game.shots = [shot(game, "robot", 100, 100), shot(game, "player", 180, 200, 440, 0)];
  updateGame(game, 0.01, idle);
  assert.equal(game.outcome, "dying");
  assert.equal(game.score, 10_100, "robot and room-clear points cross the 10,000 threshold");
  advance(game, 2.01);
  assert.equal(game.outcome, "playing");
  assert.equal(game.lives, 1, "the earned life permits respawn after the last life was consumed");

  game.score = 49_950;
  game.robots = [robot(game, 200, 200)];
  game.shots = [shot(game, "player", 180, 200, 440, 0)];
  updateGame(game, 0.05, idle);
  assert.equal(game.lives, 2);
  game.robots = [robot(game, 200, 200)];
  game.shots = [shot(game, "player", 180, 200, 440, 0)];
  updateGame(game, 0.05, idle);
  assert.equal(game.lives, 2, "each threshold awards at most once per run");
});

test("one simultaneous score award crossing both life thresholds grants both", () => {
  const game = emptyGame();
  game.lives = 1;
  game.score = 9_950;
  game.walls = [];
  game.robots = Array.from({ length: 801 }, (_, index) => robot(game, 300, 300, { id: index + 1 }));
  game.shots = [shot(game, "robot", 100, 100)];
  updateGame(game, 0.01, idle);
  assert.equal(game.outcome, "dying");
  assert.equal(game.robots.length, 0);
  assert.equal(game.score, 50_100);
  assert.equal(game.lives, 2, "the one score change awards a life at both 10,000 and 50,000");
  advance(game, 2.01);
  assert.equal(game.outcome, "playing", "both earned lives allow the respawn");
  assert.equal(game.lives, 2);
});

test("last life becomes game over only after the death interval; restart starts a fresh run", () => {
  const game = emptyGame();
  game.lives = 1;
  game.robots = [robot(game, 100, 100)];
  updateGame(game, 0.01, idle);
  assert.equal(game.outcome, "dying");
  advance(game, 1.99);
  assert.equal(game.outcome, "dying");
  updateGame(game, 0.02, idle);
  assert.equal(game.outcome, "lost");
  updateGame(game, 0.1, { ...idle, moveX: 1 });
  assert.equal(game.outcome, "lost");
  updateGame(game, 0.01, { ...idle, restartPressed: true });
  assert.equal(game.outcome, "playing");
  assert.equal(game.lives, 3);
  assert.equal(game.score, 0);
  assert.equal(game.shots.length, 0);
});

test("room clear keeps simulation playable and restart resets player, robots, walls and shots", () => {
  const game = emptyGame();
  game.robots = [robot(game, 150, 100)];
  game.shots = [shot(game, "player", 130, 100, 440, 0)];
  updateGame(game, 0.05, idle);
  assert.equal(game.outcome, "playing");
  const elapsed = game.elapsed;
  updateGame(game, 0.05, { ...idle, moveX: 1, fire: true, aimY: 1 });
  assert.ok(game.elapsed > elapsed);
  assert.equal(game.shots.length, 1);

  game.player.x = 500;
  game.walls = [];
  restartGame(game);
  assert.equal(game.outcome, "playing");
  assert.equal(game.player.x, 75);
  assert.equal(game.player.y, 300);
  assert.equal(game.robots.length, 6);
  assert.ok(game.walls.length > 0);
  assert.equal(game.shots.length, 0);
});
