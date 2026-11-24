import assert from "node:assert/strict";
import test from "node:test";
import { InputController, inputDestination, settingsKeyAction } from "./input.ts";
import { readHighScore, writeHighScore } from "./high-score.ts";
import {
  createGame,
  pauseGame,
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
  startPressed: false, pausePressed: false, titlePressed: false, connected: false,
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

test("hyperspace is unavailable during invulnerability and works after it expires", () => {
  const game = makeGame();
  game.asteroids = [asteroid(game, 300, 200)];
  game.ship.x = 20;
  game.ship.y = 30;
  game.ship.velocityX = 10;
  game.ship.invulnerable = 1;
  updateGame(game, 0, { ...idle, hyperspacePressed: true });
  assert.equal(game.ship.x, 20);
  assert.equal(game.ship.y, 30);
  assert.equal(game.ship.velocityX, 10);
  assert.equal(game.ship.hyperspaceCooldown, 0);

  game.ship.invulnerable = 0;
  updateGame(game, 0, { ...idle, hyperspacePressed: true });
  assert.equal(game.ship.velocityX, 0);
  assert.equal(game.ship.hyperspaceCooldown, 5);
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

test("game over returns to title after ten seconds or a menu press, while restart takes priority", () => {
  const game = makeGame();
  game.screen = "gameover";
  game.gameOverRemaining = 10;
  game.highScore = 400;
  advance(game, 9.9);
  assert.equal(game.screen, "gameover");
  advance(game, 0.2);
  assert.equal(game.screen, "title");
  assert.equal(game.highScore, 400);
  assert.equal(game.asteroids.length, 0);
  game.screen = "gameover"; game.gameOverRemaining = 10;
  updateGame(game, 0.01, { ...idle, titlePressed: true });
  assert.equal(game.screen, "title");
  game.screen = "gameover"; game.gameOverRemaining = 0;
  updateGame(game, 0.01, { ...idle, startPressed: true });
  assert.equal(game.screen, "playing");
  assert.equal(game.highScore, 400);
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

function key(code, value = code, repeat = false, shiftKey = false) {
  return { code, key: value, repeat, shiftKey };
}

function gamepad(index = 0) {
  return {
    index, id: "controller", mapping: "standard", connected: true,
    axes: [0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
  };
}

function mapInput(controller, screen, pads = []) {
  return controller.gameplay(screen, controller.read(pads));
}

test("keyboard controls use physical positions, track releases, and ignore repeat edges", () => {
  const controller = new InputController();
  const game = createGame();
  assert.equal(controller.keyDown(key("Enter")), true);
  updateGame(game, 0, mapInput(controller, game.screen));
  assert.equal(game.screen, "playing");
  controller.keyDown(key("Enter", "Enter", true));
  assert.equal(mapInput(controller, game.screen).startPressed, false);

  assert.equal(controller.keyDown(key("KeyW", "z")), true);
  assert.equal(mapInput(controller, game.screen).thrust, true);
  controller.keyUp(key("KeyW", "Z"));
  assert.equal(controller.keyDown(key("KeyZ", "w")), false);
  assert.equal(mapInput(controller, game.screen).thrust, false);
  assert.equal(controller.keyDown(key("", "w")), false);
  controller.keyDown(key("ShiftLeft", "Shift"));
  assert.equal(mapInput(controller, game.screen).hyperspacePressed, true);
  controller.keyDown(key("ShiftLeft", "Shift", true));
  assert.equal(mapInput(controller, game.screen).hyperspacePressed, false);
});

test("first-observed buttons are inert until release while axes are immediately available", () => {
  const controller = new InputController();
  const pad = gamepad();
  pad.axes = [0.4, -0.5];
  for (const index of [1, 2, 8, 9]) pad.buttons[index].pressed = true;
  const first = controller.read([pad]);
  assert.equal(inputDestination("title", false, first), "gameplay");
  let frame = controller.gameplay("title", first);
  assert.equal(frame.connected, true);
  assert.equal(frame.turn, 0.4);
  assert.equal(frame.thrust, true);
  assert.equal(frame.fire, false);
  assert.equal(frame.hyperspacePressed, false);
  assert.equal(frame.startPressed, false);

  for (const index of [1, 2, 8, 9]) pad.buttons[index].pressed = false;
  controller.read([pad]);
  for (const index of [1, 2, 9]) pad.buttons[index].pressed = true;
  controller.keyDown(key("KeyA", "q"));
  controller.keyDown(key("ShiftRight", "Shift"));
  frame = mapInput(controller, "title", [pad]);
  assert.equal(frame.turn, -0.6);
  assert.equal(frame.fire, true);
  assert.equal(frame.hyperspacePressed, true);
  assert.equal(frame.startPressed, true);
  frame = mapInput(controller, "playing", [pad]);
  assert.equal(frame.hyperspacePressed, false);
  assert.equal(frame.pausePressed, false);
  pad.buttons[9].pressed = false;
  controller.read([pad]);
  pad.buttons[9].pressed = true;
  assert.equal(mapInput(controller, "playing", [pad]).pausePressed, true);
});

test("return to title requires a fresh Escape or gamepad B press", () => {
  const controller = new InputController();
  const pad = gamepad();
  controller.read([pad]);
  pad.buttons[1].pressed = true;
  mapInput(controller, "playing", [pad]);
  assert.equal(mapInput(controller, "gameover", [pad]).titlePressed, false);
  pad.buttons[1].pressed = false;
  controller.read([pad]);
  pad.buttons[1].pressed = true;
  assert.equal(mapInput(controller, "gameover", [pad]).titlePressed, true);
  controller.keyDown(key("Escape"));
  assert.equal(mapInput(controller, "gameover", [pad]).titlePressed, true);
  controller.keyDown(key("Escape", "Escape", true));
  assert.equal(mapInput(controller, "gameover", [pad]).titlePressed, false);
});

test("settings use a separate frame destination and require fresh controls on exit", () => {
  const controller = new InputController();
  const pad = gamepad();
  controller.read([pad]);
  for (const index of [1, 8, 9]) pad.buttons[index].pressed = true;
  const opening = controller.read([pad]);
  assert.equal(inputDestination("paused", false, opening), "open-settings");
  assert.equal(inputDestination("playing", false, opening), "gameplay");

  controller.keyDown(key("KeyP", "p"));
  controller.suppressAtSettingsTransition([pad]);
  const settings = controller.read([pad]);
  assert.equal(inputDestination("paused", true, settings), "settings");
  assert.equal(settings.gamepads[0].buttonsPressed.has(1), false);
  assert.deepEqual(settings.keyboard.pressed, []);
  assert.equal(settingsKeyAction(key("Tab", "Tab", true, true)), "previous");
  assert.equal(settingsKeyAction(key("Enter", "Enter", true)), undefined);
  const close = key("Space", " ");
  assert.equal(settingsKeyAction(close), "activate");
  controller.blockKey(close);

  // A keyboard or pointer close samples the newest gamepad state before the next frame.
  pad.axes = [-0.7, -0.8];
  for (const index of [0, 2, 14]) pad.buttons[index].pressed = true;
  controller.suppressAtSettingsTransition([pad]);
  controller.keyDown(close);
  controller.keyDown(key("KeyP", "p"));
  const frame = mapInput(controller, "paused", [pad]);
  assert.equal(frame.turn, 0);
  assert.equal(frame.thrust, false);
  assert.equal(frame.fire, false);
  assert.equal(frame.hyperspacePressed, false);
  assert.equal(frame.pausePressed, false);

  controller.keyUp(close);
  controller.keyDown(close);
  pad.buttons.forEach((button) => { button.pressed = false; });
  pad.axes = [0, 0];
  assert.equal(mapInput(controller, "paused", [pad]).fire, true);
  pad.buttons[9].pressed = true;
  assert.equal(mapInput(controller, "paused", [pad]).pausePressed, true);
});

test("focus reset clears missed key releases, ignores orphan repeats, and gates returning gamepads", () => {
  const controller = new InputController();
  const game = makeGame();
  const pad = gamepad();
  controller.read([pad]);
  controller.keyDown(key("KeyP", "p"));
  controller.keyDown(key("KeyW", "z"));
  const before = controller.read([pad]).gamepads[0].connectionId;
  controller.loseFocus();
  pauseGame(game);
  controller.read(null);
  pad.axes = [0.7, -0.8];
  pad.buttons[9].pressed = true;
  controller.keyDown(key("KeyP", "p", true));
  controller.keyDown(key("KeyW", "z", true));
  const returned = controller.read([pad]);
  assert.notEqual(returned.gamepads[0].connectionId, before);
  let frame = controller.gameplay(game.screen, returned);
  assert.equal(frame.turn, 0);
  assert.equal(frame.thrust, false);
  assert.equal(frame.pausePressed, false);
  updateGame(game, 0, frame);
  assert.equal(game.screen, "paused");

  controller.keyDown(key("Enter"));
  updateGame(game, 0, mapInput(controller, game.screen, [pad]));
  assert.equal(game.screen, "paused");

  controller.keyDown(key("KeyP", "p"));
  controller.keyDown(key("KeyW", "z"));
  frame = mapInput(controller, game.screen, [pad]);
  assert.equal(frame.pausePressed, true);
  assert.equal(frame.thrust, true);
  updateGame(game, 0, frame);
  assert.equal(game.screen, "playing");
});

test("a same-slot reconnect loses its prior history without changing another controller", () => {
  const controller = new InputController();
  const first = gamepad();
  const second = gamepad(1);
  const [oldFirst, oldSecond] = controller.read([first, second]).gamepads;
  first.buttons[9].pressed = true;
  second.buttons[9].pressed = true;
  controller.forgetConnection(first.index);
  const frame = controller.read([first, second]);
  assert.notEqual(frame.gamepads[0].connectionId, oldFirst.connectionId);
  assert.equal(frame.gamepads[1].connectionId, oldSecond.connectionId);
  assert.equal(frame.gamepads[0].buttonsPressed.has(9), false);
  assert.equal(frame.gamepads[1].buttonsPressed.has(9), true);
  assert.equal(controller.gameplay("title", frame).startPressed, false);

  const absent = controller.read([null, second]);
  assert.equal(absent.gamepads[0].connectionId, oldSecond.connectionId);
  const reappeared = controller.read([first, second]);
  assert.notEqual(reappeared.gamepads[0].connectionId, frame.gamepads[0].connectionId);
  assert.equal(reappeared.gamepads[0].buttonsDown.has(9), false);
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
