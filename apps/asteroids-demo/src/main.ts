import {
  createWebGL2Renderer,
  drawCircle,
  drawPolygonOutline,
  drawText,
  measureText,
  type Color,
  type DisplayProfile,
  type DrawingContext,
} from "one-more-glow";
import {
  createGame,
  pauseGame,
  respawnIsWaiting,
  updateGame,
  WORLD,
  type Asteroid,
  type Game,
} from "./game.ts";
import { canOpenSettings, InputController, inputDestination, preventsGameplayDefault, settingsKeyAction } from "./input.ts";
import { readHighScore, writeHighScore } from "./high-score.ts";
import { ASTEROIDS_DEFAULT_DISPLAY_PROFILE, readDisplayProfile, writeDisplayProfile } from "./display-profile.ts";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#screen");
if (!canvas) throw new Error("Missing #screen canvas");
const screen = canvas;
const gl = canvas.getContext("webgl2", { alpha: true });
if (!gl) throw new Error("WebGL2 is unavailable in this browser");
const renderer = createWebGL2Renderer(gl);
const drawing: DrawingContext = renderer;

const profileFields = ["lineWidth", "pointRadius", "glowStrength", "glowSpread"] as const;
const sliderRows = [190, 90, -10, -110] as const;
const sliderTrack = { left: -420, right: 40 } as const;
let profile: DisplayProfile = readDisplayProfile(() => window.localStorage);
renderer.setDisplayProfile(profile);
function saveProfile(): void { writeDisplayProfile(() => window.localStorage, profile); }
const profileRanges = [[0.5, 4], [0.5, 4], [0, 2], [0.5, 2]] as const;
let settingsOpen = false;
let selectedSetting = 0;
let gamepadNavAt = 0;
let inputActive = document.hasFocus() && !document.hidden;
function currentGamepads(): (Gamepad | null)[] { return Array.from(navigator.getGamepads?.() ?? []); }
function displayProfile(): void { renderer.setDisplayProfile(profile); }
function openSettings(pads = currentGamepads()): void {
  if (settingsOpen || !canOpenSettings(game.screen)) return;
  settingsOpen = true;
  selectedSetting = 0;
  input.suppressAtSettingsTransition(pads);
  screen.focus();
}
function closeSettings(pads = currentGamepads()): void {
  if (!settingsOpen) return;
  input.suppressAtSettingsTransition(pads);
  settingsOpen = false;
  screen.focus();
}
function setProfileField(index: number, value: number): void {
  const [minimum, maximum] = profileRanges[index];
  const field = profileFields[index];
  profile = { ...profile, [field]: Math.max(minimum, Math.min(maximum, Math.round(value * 10) / 10)) };
  displayProfile();
  saveProfile();
}
function adjustSelected(direction: number): void {
  if (selectedSetting < profileFields.length) setProfileField(selectedSetting, profile[profileFields[selectedSetting]] + direction * 0.1);
}
function resetProfile(): void {
  profile = { ...ASTEROIDS_DEFAULT_DISPLAY_PROFILE };
  displayProfile();
  saveProfile();
}
function activateSelected(pads?: (Gamepad | null)[]): void {
  if (selectedSetting === 4) resetProfile();
  else if (selectedSetting === 5) closeSettings(pads);
  else adjustSelected(1);
}
function moveSelection(direction: number): void { selectedSetting = (selectedSetting + direction + 6) % 6; }
displayProfile();

const cyan: Color = [0.24, 0.91, 1];
const paleBlue: Color = [0.65, 0.92, 1];
const amber: Color = [1, 0.63, 0.29];
const dimBlue: Color = [0.25, 0.68, 0.82];
const input = new InputController();
const game = createGame();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

game.highScore = readHighScore(() => window.localStorage);

type Point = readonly [number, number];
const shipShape: readonly Point[] = [[0, 25], [-16, -17], [0, -9], [16, -17]];
const shipDetail: readonly Point[] = [[-9, -12], [0, -4], [9, -12]];
const starfield = Array.from({ length: 95 }, (_, i) => {
  const seed = i * 127.1 + 31.7;
  return {
    x: fract(Math.sin(seed) * 43758.5453) * WORLD.halfWidth * 2 - WORLD.halfWidth,
    y: fract(Math.sin(seed + 17.3) * 24634.6345) * WORLD.halfHeight * 2 - WORLD.halfHeight,
    intensity: 0.18 + fract(Math.sin(seed + 8.4) * 17431.73) * 0.38,
  };
});

function fract(value: number): number { return value - Math.floor(value); }
function resizeCanvas(): void {
  const rect = screen.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  screen.width = Math.max(1, Math.round(rect.width * ratio));
  screen.height = Math.max(1, Math.round(rect.height * ratio));
}

function drawWrapped(x: number, y: number, radius: number, drawAt: (x: number, y: number) => void): void {
  const xs = [0];
  const ys = [0];
  if (x - radius < -WORLD.halfWidth) xs.push(WORLD.halfWidth * 2);
  if (x + radius > WORLD.halfWidth) xs.push(-WORLD.halfWidth * 2);
  if (y - radius < -WORLD.halfHeight) ys.push(WORLD.halfHeight * 2);
  if (y + radius > WORLD.halfHeight) ys.push(-WORLD.halfHeight * 2);
  for (const dx of xs) for (const dy of ys) drawAt(x + dx, y + dy);
}

function drawVerticalWraps(x: number, y: number, radius: number, drawAt: (x: number, y: number) => void): void {
  const ys = [0];
  if (y - radius < -WORLD.halfHeight) ys.push(WORLD.halfHeight * 2);
  if (y + radius > WORLD.halfHeight) ys.push(-WORLD.halfHeight * 2);
  for (const dy of ys) drawAt(x, y + dy);
}

function drawAsteroid(asteroid: Asteroid): void {
  drawWrapped(asteroid.x, asteroid.y, asteroid.radius, (x, y) => {
    drawing.pushTransform();
    drawing.translate(x, y);
    drawing.rotate(asteroid.angle * 180 / Math.PI);
    drawing.setColor(asteroid.size === "small" ? paleBlue : dimBlue);
    drawing.setIntensity(asteroid.size === "large" ? 0.8 : 0.95);
    drawPolygonOutline(drawing, asteroid.shape);
    drawing.popTransform();
  });
}

function drawShip(gameState: Game, now: number): void {
  const ship = gameState.ship;
  if (gameState.screen === "title" || !ship.alive
    || (ship.invulnerable > 0 && Math.floor(now / 90) % 2 === 0)) return;
  const flame = 18 + Math.sin(now * 0.035) * 6;
  drawWrapped(ship.x, ship.y, 30, (x, y) => {
    drawing.pushTransform();
    drawing.translate(x, y);
    drawing.rotate(-ship.heading * 180 / Math.PI);
    drawing.setColor(cyan);
    drawing.setIntensity(1);
    drawPolygonOutline(drawing, shipShape);
    drawing.setColor(paleBlue);
    drawing.setIntensity(0.6);
    drawing.moveTo(...shipDetail[0]); drawing.lineTo(...shipDetail[1]); drawing.lineTo(...shipDetail[2]);
    if (gameState.thrusting) {
      drawing.setColor(amber); drawing.setIntensity(1);
      drawing.moveTo(-6, -16); drawing.lineTo(0, -flame); drawing.lineTo(6, -16);
    }
    if (ship.invulnerable > 0) {
      drawing.setColor(dimBlue); drawing.setIntensity(0.45);
      drawCircle(drawing, [0, 0], 31);
    }
    drawing.popTransform();
  });
}

function drawSaucer(gameState: Game): void {
  const saucer = gameState.saucer;
  if (!saucer) return;
  const radius = saucer.kind === "small" ? 18 : 26;
  const hull: readonly Point[] = [[-radius, 0], [-radius * 0.55, -5], [-radius * 0.3, -10],
    [radius * 0.3, -10], [radius * 0.55, -5], [radius, 0], [radius * 0.55, 5],
    [-radius * 0.55, 5], [-radius, 0]];
  drawVerticalWraps(saucer.x, saucer.y, radius + 10, (x, y) => {
    drawing.pushTransform(); drawing.translate(x, y);
    drawing.setColor(saucer.kind === "small" ? amber : paleBlue); drawing.setIntensity(1);
    drawPolygonOutline(drawing, hull);
    drawing.moveTo(-radius * 0.3, -10); drawing.lineTo(0, -16); drawing.lineTo(radius * 0.3, -10);
    drawing.popTransform();
  });
}

function drawShots(gameState: Game): void {
  for (const shot of gameState.projectiles) {
    const color = shot.owner === "player" ? cyan : amber;
    drawing.setColor(color); drawing.setIntensity(shot.owner === "player" ? 1.2 : 1.4);
    drawWrapped(shot.x, shot.y, 15, (x, y) => {
      drawing.moveTo(x, y); drawing.lineTo(x - shot.velocityX * 0.025, y - shot.velocityY * 0.025);
    });
  }
}

function drawEffects(gameState: Game): void {
  for (const effect of gameState.explosions) {
    const radius = (1 - effect.remaining / 0.8) * 28 + 5;
    drawing.setColor(amber); drawing.setIntensity(Math.min(1.5, effect.remaining * 2));
    drawCircle(drawing, [effect.x, effect.y], radius);
    for (let i = 0; i < 6; i += 1) {
      const angle = i * Math.PI / 3;
      drawing.moveTo(effect.x + Math.cos(angle) * radius * 0.55, effect.y + Math.sin(angle) * radius * 0.55);
      drawing.lineTo(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius);
    }
  }
}

const textOptions = { font: "segment16", height: 18, spacing: "kerned" } as const;
const settingsTextOptions = { ...textOptions, height: 25 } as const;
function label(text: string, x: number, y: number, color: Color = paleBlue, intensity = 1): void {
  drawing.setColor(color); drawing.setIntensity(intensity); drawText(drawing, text, x, y, textOptions);
}
function settingLabel(text: string, x: number, y: number, color: Color = paleBlue, intensity = 1, height = 25): void {
  drawing.setColor(color); drawing.setIntensity(intensity);
  drawText(drawing, text, x, y, { ...settingsTextOptions, height });
}
function centered(text: string, y: number, color: Color = paleBlue, intensity = 1): void {
  label(text, -measureText(text, textOptions).width / 2, y, color, intensity);
}
function titleHeading(text: string, y: number, height: number, color: Color, intensity: number): void {
  const options = { font: "segment16", height, spacing: "kerned" } as const;
  drawing.setColor(color); drawing.setIntensity(intensity);
  drawText(drawing, text, -measureText(text, options).width / 2, y, options);
}
function centeredAt(text: string, centerX: number, y: number, color: Color = paleBlue, intensity = 1): void {
  label(text, centerX - measureText(text, textOptions).width / 2, y, color, intensity);
}

function drawTitleVignette(now: number): void {
  const time = reducedMotion.matches ? 0 : now / 1000;
  const rock: readonly Point[] = [[-26, 2], [-19, 19], [-3, 27], [10, 17], [22, 23], [29, 5], [23, -17], [5, -25], [-16, -20], [-26, 2]];
  for (const [x, y, scale, speed] of [[-165, 95, 0.75, 0.12], [166, 105, 0.55, -0.16]] as const) {
    drawing.pushTransform();
    drawing.translate(x, y + Math.sin(time * 0.5 + x) * 3);
    drawing.rotate(time * speed * 180 / Math.PI);
    drawing.scale(scale, scale);
    drawing.setColor(dimBlue); drawing.setIntensity(0.55);
    drawPolygonOutline(drawing, rock);
    drawing.popTransform();
  }
  drawing.pushTransform();
  drawing.translate(0, 94 + Math.sin(time * 0.7) * 2);
  drawing.rotate(-35);
  drawing.setColor(cyan); drawing.setIntensity(0.7);
  drawPolygonOutline(drawing, shipShape);
  drawing.popTransform();
}

function drawHud(gameState: Game): void {
  label(`SCORE ${String(gameState.score).padStart(6, "0")}`, -485, 350, cyan);
  label(`HI ${String(gameState.highScore).padStart(6, "0")}`, -215, 350, dimBlue);
  label(`WAVE ${String(gameState.wave).padStart(2, "0")}`, 120, 350);
  label(`SHIPS ${gameState.lives}`, 350, 350, amber);
  if (gameState.ship.alive) {
    label(`SPEED ${String(Math.round(Math.hypot(gameState.ship.velocityX, gameState.ship.velocityY))).padStart(3, "0")}`,
      -485, -350, dimBlue);
    label(gameState.ship.hyperspaceCooldown > 0
      ? `HYPER ${gameState.ship.hyperspaceCooldown.toFixed(1)}` : "HYPER READY", -220, -350, amber);
    label(gameState.thrusting ? "THRUST ENGAGED" : "THRUST OFF", 75, -350, amber);
  } else if (respawnIsWaiting(gameState)) {
    if (settingsOpen) centeredAt("WAITING FOR SAFE AREA", -250, -350, amber);
    else centered("WAITING FOR SAFE AREA", -350, amber);
  } else if (gameState.lives > 0) {
    const text = `RESPAWN ${Math.max(0, gameState.ship.respawnDelay).toFixed(1)}`;
    if (settingsOpen) centeredAt(text, -250, -350, amber);
    else centered(text, -350, amber);
  }
  label(gameState.inputConnected ? "CONTROLLER CONNECTED" : "KEYBOARD READY", -485, -375, dimBlue, 0.8);
}

function drawMessage(gameState: Game, now: number): void {
  const center = (text: string, y: number, color: Color = paleBlue, intensity = 1) => {
    if (settingsOpen) centeredAt(text, -250, y, color, intensity);
    else centered(text, y, color, intensity);
  };
  if (gameState.screen === "title") {
    const brandOptions = { font: "segment16", height: 27, spacing: "kerned" } as const;
    const prefix = "ONE MORE ";
    const brandX = -measureText(`${prefix}GLOW`, brandOptions).width / 2;
    drawing.setColor(paleBlue); drawing.setIntensity(1);
    drawText(drawing, prefix, brandX, 240, brandOptions);
    const pulse = reducedMotion.matches ? 0 : (1 + Math.sin(now * Math.PI * 2 / 3000)) / 2;
    drawing.setColor([
      paleBlue[0] + (amber[0] - paleBlue[0]) * pulse,
      paleBlue[1] + (amber[1] - paleBlue[1]) * pulse,
      paleBlue[2] + (amber[2] - paleBlue[2]) * pulse,
    ]);
    drawing.setIntensity(1 + 0.3 * pulse);
    drawText(drawing, "GLOW", brandX + measureText(prefix, brandOptions).width, 240, brandOptions);
    titleHeading("ASTEROIDS", 165, 58, cyan, 1.3);
    drawTitleVignette(now);
    label("KEYBOARD", -350, 27, cyan, 0.9);
    label("GAMEPAD", 70, 27, cyan, 0.9);
    label("TURN   ARROWS / A D", -350, -7);
    label("TURN   STICK / D-PAD", 70, -7);
    label("THRUST UP / W", -350, -37);
    label("THRUST UP / A", 70, -37);
    label("FIRE   SPACE", -350, -67);
    label("FIRE   B", 70, -67);
    label("HYPER  SHIFT", -350, -97);
    label("HYPER  X", 70, -97);
    center("PRESS ENTER OR START", -158, amber, 1.1);
    center(`HIGH SCORE ${String(gameState.highScore).padStart(6, "0")}`, -205, dimBlue);
    center("S / BACK/SELECT: SETTINGS", -238, dimBlue);
  } else if (gameState.screen === "paused") {
    center("PAUSED", 190, amber, 1.2);
    center("PRESS P OR GAMEPAD START TO RESUME", 150);
    center("S / BACK/SELECT: SETTINGS", 110, dimBlue);
  } else if (gameState.screen === "gameover") {
    center("GAME OVER", 72, amber, 1.2);
    center(`FINAL SCORE ${String(gameState.score).padStart(6, "0")}`, 24);
    center(`HIGH SCORE ${String(gameState.highScore).padStart(6, "0")}`, -18, dimBlue);
    center("ENTER OR GAMEPAD START: RESTART", -74, paleBlue);
    center("ESC OR GAMEPAD B: MAIN MENU", -112, dimBlue);
  } else if (gameState.screen === "intermission") {
    center("WAVE CLEAR", 230, cyan, 1.2);
  } else if (gameState.waveBanner > 0) {
    center(`WAVE ${gameState.wave}`, 230, cyan, 1.1);
  }
}

function drawOutline(points: readonly Point[], color: Color = dimBlue, intensity = 0.8): void {
  drawing.setColor(color);
  drawing.setIntensity(intensity);
  drawPolygonOutline(drawing, points);
}


function drawSettings(): void {
  settingLabel("DISPLAY SETTINGS", -448, 315, cyan, 1.2, 29);
  settingLabel("TUNE THE VECTOR DISPLAY", -448, 275, dimBlue, 0.9, 16);

  const labels = ["LINE WIDTH", "POINT RADIUS", "GLOW STRENGTH", "GLOW SPREAD"];
  for (let index = 0; index < profileFields.length; index += 1) {
    const rowY = sliderRows[index];
    const trackY = rowY - 28;
    const [minimum, maximum] = profileRanges[index];
    const value = profile[profileFields[index]];
    const focused = selectedSetting === index;
    if (focused) drawOutline([[-454, rowY - 49], [70, rowY - 49], [70, rowY + 35], [-454, rowY + 35], [-454, rowY - 49]], amber, 1);
    settingLabel(labels[index], -420, rowY + 4, focused ? amber : paleBlue, 1, 20);
    settingLabel(value.toFixed(1), 8, rowY + 4, focused ? amber : cyan, 1, 20);
    drawing.setColor(dimBlue); drawing.setIntensity(0.8);
    drawing.moveTo(sliderTrack.left, trackY); drawing.lineTo(sliderTrack.right, trackY);
    for (let tick = 0; tick <= 4; tick += 1) {
      const x = sliderTrack.left + ((sliderTrack.right - sliderTrack.left) * tick / 4);
      drawing.moveTo(x, trackY - 4); drawing.lineTo(x, trackY + 4);
    }
    const ratio = (value - minimum) / (maximum - minimum);
    const handleX = sliderTrack.left + ratio * (sliderTrack.right - sliderTrack.left);
    drawing.setColor(focused ? amber : cyan); drawing.setIntensity(1.2);
    drawCircle(drawing, [handleX, trackY], 8);
  }

  drawOutline([[115, -125], [451, -125], [451, 215], [115, 215], [115, -125]], dimBlue, 0.6);
  settingLabel("PREVIEW", 135, 175, dimBlue, 0.9, 17);
  drawing.pushTransform(); drawing.translate(280, 18); drawing.rotate(-25);
  drawOutline(shipShape, cyan, 1.2); drawing.popTransform();
  drawOutline([[157, 72], [175, 105], [202, 112], [219, 98], [236, 108], [253, 76], [245, 46], [219, 35], [188, 41], [164, 48], [157, 72]], paleBlue, 1);
  drawing.setColor(amber); drawing.setIntensity(1.3);
  drawing.moveTo(330, -55); drawing.lineTo(376, -55); drawing.point(397, -55);
  drawing.setColor(dimBlue); drawing.setIntensity(0.7);
  for (const [x, y] of [[150, -85], [210, -45], [365, 120], [416, 45], [318, 135]] as const) drawing.point(x, y);

  const resetFocused = selectedSetting === 4;
  const closeFocused = selectedSetting === 5;
  if (resetFocused) drawOutline([[-454, -232], [-205, -232], [-205, -188], [-454, -188], [-454, -232]], amber, 1);
  if (closeFocused) drawOutline([[-180, -232], [-20, -232], [-20, -188], [-180, -188], [-180, -232]], amber, 1);
  settingLabel("RESET DEFAULTS", -432, -218, resetFocused ? amber : paleBlue, 1, 17);
  settingLabel("CLOSE", -158, -218, closeFocused ? amber : paleBlue, 1, 17);
  settingLabel("UP / DOWN SELECT    LEFT / RIGHT ADJUST", -448, -285, dimBlue, 0.9, 16);
  settingLabel("TAB NAVIGATE   ESC CLOSE   GAMEPAD Y RESET / B CLOSE", -448, -318, dimBlue, 0.9, 13);
}

function logicalPointerPosition(event: PointerEvent): Point {
  const rect = screen.getBoundingClientRect();
  return [((event.clientX - rect.left) / rect.width) * WORLD.halfWidth * 2 - WORLD.halfWidth,
    WORLD.halfHeight - ((event.clientY - rect.top) / rect.height) * WORLD.halfHeight * 2];
}

function updateSliderFromPointer(index: number, x: number): void {
  const [minimum, maximum] = profileRanges[index];
  const ratio = Math.max(0, Math.min(1, (x - sliderTrack.left) / (sliderTrack.right - sliderTrack.left)));
  const value = Math.round((minimum + ratio * (maximum - minimum)) * 10) / 10;
  selectedSetting = index;
  setProfileField(index, value);
}

screen.addEventListener("pointerdown", (event) => {
  const [x, y] = logicalPointerPosition(event);
  if (!inputActive || !settingsOpen) return;
  if (x >= -180 && x <= -20 && y >= -232 && y <= -188) { event.preventDefault(); closeSettings(); return; }
  if (x >= -454 && x <= -205 && y >= -232 && y <= -188) {
    event.preventDefault();
    selectedSetting = 4;
    resetProfile();
    return;
  }
  const row = sliderRows.findIndex((rowY) => y >= rowY - 58 && y <= rowY + 26);
  if (row >= 0 && x >= -454 && x <= 70) {
    event.preventDefault();
    if (y <= sliderRows[row] - 14 && x >= sliderTrack.left - 20 && x <= sliderTrack.right + 20) updateSliderFromPointer(row, x);
    else selectedSetting = row;
  }
});

function draw(gameState: Game, now: number): void {
  drawing.beginFrame();
  if (settingsOpen) {
    drawSettings();
    drawing.endFrame();
    return;
  }
  for (const star of starfield) { drawing.setColor(dimBlue); drawing.setIntensity(star.intensity); drawing.point(star.x, star.y); }
  for (const asteroid of gameState.asteroids) drawAsteroid(asteroid);
  drawSaucer(gameState); drawShots(gameState); drawEffects(gameState); drawShip(gameState, now);
  if (gameState.screen !== "title") drawHud(gameState);
  drawMessage(gameState, now);
  drawing.endFrame();
}

window.addEventListener("keydown", (event) => {
  if (!inputActive) return;
  if (event.code === "KeyS" && !event.ctrlKey && !event.metaKey && !event.altKey && (settingsOpen || canOpenSettings(game.screen))) {
    event.preventDefault();
    input.blockKey(event);
    if (!settingsOpen && !event.repeat) openSettings();
    return;
  }
  if (settingsOpen) {
    input.blockKey(event);
    if (preventsGameplayDefault(event.code) || event.code === "ArrowDown" || event.code === "Tab") {
      event.preventDefault();
    }
    switch (settingsKeyAction(event)) {
      case "previous": moveSelection(-1); break;
      case "next": moveSelection(1); break;
      case "decrease": adjustSelected(-1); break;
      case "increase": adjustSelected(1); break;
      case "activate": activateSelected(); break;
      case "close": closeSettings(); break;
    }
    return;
  }
  if (input.keyDown(event)) event.preventDefault();
});
window.addEventListener("keyup", (event) => input.keyUp(event));

function setInputActive(active: boolean): void {
  if (inputActive === active) return;
  inputActive = active;
  if (active) return;
  input.loseFocus();
  pauseGame(game);
}
window.addEventListener("blur", () => setInputActive(false));
window.addEventListener("focus", () => setInputActive(!document.hidden));
document.addEventListener("visibilitychange", () => setInputActive(!document.hidden && document.hasFocus()));
window.addEventListener("gamepadconnected", (event) => input.forgetConnection(event.gamepad.index));
window.addEventListener("gamepaddisconnected", (event) => input.forgetConnection(event.gamepad.index));
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let lastTime = 0;
let storedHighScore = game.highScore;
function frame(now: number): void {
  const dt = lastTime === 0 ? 0 : Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  const pads = inputActive ? currentGamepads() : null;
  const devices = input.read(pads);
  const destination = inputDestination(game.screen, settingsOpen, devices);
  const pad = devices.gamepads[0];
  const pressed = (index: number) => pad?.buttonsPressed.has(index) ?? false;
  const down = (index: number) => pad?.buttonsDown.has(index) ?? false;
  if (pads && destination === "open-settings") {
    openSettings(pads);
  } else if (pads && destination === "settings") {
    if (pressed(1)) closeSettings(pads);
    else if (pressed(0)) activateSelected(pads);
    const vertical = down(13) ? 1 : down(12) ? -1 : 0;
    if (settingsOpen && vertical && now >= gamepadNavAt) {
      moveSelection(vertical); gamepadNavAt = now + 220;
    }
    const axis = pad?.axes[0] ?? 0;
    const horizontal = down(15) ? 1 : down(14) ? -1 : Math.abs(axis) > 0.45 ? Math.sign(axis) : 0;
    if (settingsOpen && horizontal && now >= gamepadNavAt) {
      adjustSelected(horizontal); gamepadNavAt = now + 160;
    }
    if (settingsOpen && pressed(3)) resetProfile();
  } else if (destination === "gameplay") {
    updateGame(game, dt, input.gameplay(game.screen, devices));
  }
  if (game.highScore !== storedHighScore) {
    storedHighScore = game.highScore;
    writeHighScore(() => window.localStorage, storedHighScore);
  }
  draw(game, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
