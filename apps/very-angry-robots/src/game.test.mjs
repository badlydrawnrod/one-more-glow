import assert from "node:assert/strict";
import test from "node:test";
import { createGame, restartGame, updateGame, ROOM_SCROLL_DURATION } from "./game.ts";

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
  assert.equal(game.robots.length, 4);
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
  assert.equal(game.robots.length, 4);
  assert.equal(game.shots.length, 0);
});

test("transition pauses movement and combat until the new room is in place", () => {
  const game = createGame(seedRandom(17));
  travel(game, "right");
  const elapsed = game.elapsed;
  const player = { ...game.player };
  const robotState = game.robots.map((robot) => ({ ...robot }));
  updateGame(game, game.transition.duration / 2, { ...idle, moveX: 1, aimX: 1, fire: true });
  assert.equal(game.elapsed, elapsed);
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
});

test("closed entrance and doorway jambs remain hazardous while open gaps are traversable", () => {
  const closed = createGame(seedRandom(52));
  closed.player.x = 30;
  closed.player.y = 300;
  for (let i = 0; i < 20 && closed.outcome === "playing"; i += 1) {
    updateGame(closed, 0.05, { ...idle, moveX: -1 });
  }
  assert.equal(closed.outcome, "lost");
  assert.equal(closed.transition, null);

  const jamb = createGame(seedRandom(53));
  jamb.player.x = 970;
  jamb.player.y = 253;
  updateGame(jamb, 0.05, { ...idle, moveX: 1 });
  assert.equal(jamb.outcome, "lost");
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
  assert.equal(jambContact.outcome, "lost");
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
  clear.player.x = 200;
  clear.player.y = 100;
  clear.robots = [robot(clear, 100, 100, { fireCooldown: 0 })];
  updateGame(clear, 0.02, idle);
  assert.equal(clear.shots[0].owner, "robot");
  clear.player.x = clear.shots[0].x + 10;
  clear.player.y = clear.shots[0].y;
  clear.shots[0].velocityX = 235;
  clear.shots[0].velocityY = 0;
  updateGame(clear, 0.02, idle);
  assert.equal(clear.outcome, "lost");
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

test("electrified wall and room edge contact defeat the player and robots", () => {
  const game = emptyGame();
  game.walls = [{ x: 120, y: 80, width: 20, height: 40, electrified: true }];
  updateGame(game, 0.1, { ...idle, moveX: 1 });
  assert.equal(game.outcome, "lost");

  const edge = emptyGame();
  edge.player.x = 20;
  updateGame(edge, 0.1, { ...idle, moveX: -1 });
  assert.equal(edge.outcome, "lost");

  const robotGame = emptyGame();
  robotGame.player.x = 700;
  robotGame.player.y = 500;
  robotGame.walls = [{ x: 120, y: 80, width: 20, height: 40, electrified: true }];
  robotGame.robots = [robot(robotGame, 100, 100, { moveSpeed: 100 })];
  for (let i = 0; i < 20; i += 1) updateGame(robotGame, 0.1, idle);
  assert.equal(robotGame.robots.length, 0);
  assert.equal(robotGame.outcome, "playing");
});

test("loss is recorded even when the final robot is destroyed in the same update", () => {
  const game = emptyGame();
  game.robots = [robot(game, 140, 100)];
  game.shots = [shot(game, "player", 120, 100, 440, 0), shot(game, "robot", 100, 100)];
  updateGame(game, 0.05, idle);
  assert.equal(game.robots.length, 0);
  assert.equal(game.outcome, "lost");
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
  assert.equal(game.robots.length, 4);
  assert.ok(game.walls.length > 0);
  assert.equal(game.shots.length, 0);
});
