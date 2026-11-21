import { createWebGL2Renderer, drawCircle, drawPolygonOutline, drawText, measureText,
  type Color, type DrawingContext, type Point } from "one-more-glow";
import { createGame, restartGame, updateGame, ROOM, ROOM_SCROLL_DURATION, DOOR_CLOSE_DURATION,
  type GameEvent, type GameView, type RoomView, type RobotColor } from "./game.ts";
import { createMaze } from "./maze.ts";
import { createRoomGeometry } from "./room-geometry.ts";
import { wallOutline } from "./wall-outline.ts";
import { InputController, TouchInputModel, type GamepadState, type InputState } from "./input.ts";
import { clippedDrawing, intersectClipBounds } from "./clipped-drawing.ts";
import { transitionOffsets } from "./transition-presentation.ts";
import { insertHighScore, loadHighScores, qualifiesForHighScore, saveHighScores } from "./high-scores.ts";
import { createScreenFlow, updateScreenFlow } from "./screen-flow.ts";
import { createInitialsEntry, updateInitialsEntry } from "./initials-entry.ts";
import { addScoreFlyup, clearScoreFlyups, createScoreFlyupState, retainPresentedRoomFlyups,
  SCORE_FLYUP_START_OFFSET, scoreFlyupOpacity, scoreFlyupRise, updateScoreFlyups } from "./score-flyups.ts";
import { addParticleEffect, clearParticleEffects, createParticleEffectState, particleEffectOpacity,
  particleMarkOffset, retainPresentedRoomParticleEffects, updateParticleEffects } from "./particle-effects.ts";
import { ROBOTS_DEFAULT_DISPLAY_PROFILE, readDisplayProfile, writeDisplayProfile } from "./display-profile.ts";
import { createSettings } from "./settings.ts";
import { canOpenDisplaySettings, focusLossOverlayState, shouldAdvanceGame, shouldAdvanceSceneTime, shouldTickAttractScreen } from "./interaction-policy.ts";
import { createAudioController, type TauntSet } from "./audio.ts";
import { gameAudioActions } from "./game-audio.ts";
import { registerAppServiceWorker } from "./pwa.ts";
import "./style.css";

registerAppServiceWorker();

const canvas = document.querySelector<HTMLCanvasElement>("#screen");
if (!canvas) throw new Error("Missing game canvas");
const screen = canvas;
const gameElement = document.querySelector<HTMLElement>(".game");
if (!gameElement) throw new Error("Missing game controls container");
const gl = screen.getContext("webgl2");
if (!gl) throw new Error("WebGL2 is unavailable");
const drawing = createWebGL2Renderer(gl);
const audio = createAudioController({ baseUrl: import.meta.env.BASE_URL });
const displayProfile = readDisplayProfile(() => window.localStorage);
drawing.setDisplayProfile(displayProfile);
const settings = createSettings({
  drawing,
  displayProfile,
  audioPreferences: audio.preferences,
  audio,
  resetDisplayProfile: ROBOTS_DEFAULT_DISPLAY_PROFILE,
  applyDisplayProfile(profile) {
    drawing.setDisplayProfile({ ...profile });
    writeDisplayProfile(() => window.localStorage, profile);
  },
});
const game = createGame();
const gameView: GameView = game;
const input = new InputController();
const touchInput = new TouchInputModel();
const touchPointerOrigins = new Map<number, { x: number; y: number; radius: number; target: HTMLElement }>();
let latestGamepadState: GamepadState | undefined;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let screenFlow = createScreenFlow();
let highScores = loadHighScores(() => window.localStorage);
let highlightedHighScoreIndex: number | null = null;
let initialsEntry = createInitialsEntry();
const scoreFlyups = createScoreFlyupState();
const particleEffects = createParticleEffectState();
let aim = { x: 1, y: 0 };
let walking = false;
let walkingRobots = new Set<number>();
let robotGaze = new Map<number, { x: number; y: number }>();
let paused = false;
let settingsOpen = false;
let settingsNeedsGamepadNeutral = false;
let runTauntSet: TauntSet = "standard";
let settingsNavAt = 0;
let previousSettingsButtons = new Set<number>();
const cyan: Color = [0.35, 0.95, 1];
const red: Color = [1, 0.35, 0.36];
const amber: Color = [1, 0.75, 0.32];
const robotColors: Record<RobotColor, Color> = {
  "dark yellow": [0.85, 0.65, 0.12], red: [1, 0.35, 0.36],
  "dark cyan": [0.12, 0.7, 0.7], green: [0.3, 0.95, 0.35],
  "dark purple": [0.65, 0.3, 0.85], "light yellow": [1, 0.95, 0.5],
  white: [1, 1, 1], "light purple": [0.85, 0.6, 1], grey: [0.7, 0.7, 0.7],
};
const robotVisualScale = 2 / 3;
const blue: Color = [0.28, 0.63, 1];
const white: Color = [0.8, 0.96, 1];
const captainSteel: Color = [0.72, 0.82, 1];
const captainEyes: Color = [1, 0.25, 0.2];
const roomCenterY = -60;
const textOptions = { font: "segment22", height: 19, spacing: "kerned" } as const;
const attractPromptY = { play: -246, navigation: -288, settings: -330 } as const;

function label(text: string, y: number, color: Color = white): void {
  drawing.setColor(color); drawing.setIntensity(1);
  drawText(drawing, text, -measureText(text, textOptions).width / 2, y, textOptions);
}

function canOpenSettings(): boolean {
  return canOpenDisplaySettings(screenFlow.screen, paused);
}

function openSettings(): void {
  if (settingsOpen || !canOpenSettings()) return;
  settingsOpen = true;
  settings.open();
  settingsNeedsGamepadNeutral = true;
  input.clearKeyboard();
  input.suppressGamepadWhileHeld(latestGamepadState);
  clearTouchInput();
}

function closeSettings(): void {
  if (!settingsOpen) return;
  settingsOpen = false;
  settings.close();
  settingsNeedsGamepadNeutral = true;
  input.clearKeyboard();
  input.suppressGamepadWhileHeld(latestGamepadState);
  clearTouchInput();
}

function settingsPointerPosition(event: PointerEvent): Point {
  const rect = screen.getBoundingClientRect();
  return [(event.clientX - rect.left) / rect.width * 1024 - 512,
    384 - (event.clientY - rect.top) / rect.height * 768];
}

function canvasGamePosition(event: PointerEvent): Point {
  const rect = screen.getBoundingClientRect();
  return [(event.clientX - rect.left) / rect.width * 1024 - 512,
    384 - (event.clientY - rect.top) / rect.height * 768];
}

function clearTouchInput(): void {
  const captures = [...touchPointerOrigins.entries()];
  touchPointerOrigins.clear();
  touchInput.clear();
  for (const [pointerId, origin] of captures) {
    origin.target.style.setProperty("--thumb-x", "0px");
    origin.target.style.setProperty("--thumb-y", "0px");
    const target = origin.target;
    if (target?.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
  }
}

function touchActionAt(position: Point): void {
  const [x, y] = position;
  if (screenFlow.screen === "playing") {
    if (paused && y >= -58 && y <= -15 && canOpenSettings()) {
      openSettings();
      return;
    }
    if ((!paused && x >= 350 && y >= 285) || (paused && Math.abs(x) <= 300 && y >= -10 && y <= 90)) {
      paused = !paused;
      input.clearKeyboard();
      input.suppressGamepadWhileHeld(latestGamepadState);
      clearTouchInput();
    }
    return;
  }

  if (screenFlow.screen === "main-menu" || screenFlow.screen === "top-scores") {
    if (y >= -270 && y <= -220) startRun();
    else if (y >= -310 && y < -270) {
      screenFlow = updateScreenFlow(screenFlow, { type: "advance" });
      audio.playEffects(["interface"]);
      clearTouchInput();
    } else if (y >= -355 && y < -310 && canOpenSettings()) openSettings();
    return;
  }

  if (screenFlow.screen === "initials") {
    if (y >= -32 && y <= 32) {
      const slot = Math.max(0, Math.min(2, Math.round((x + 28) / 28)));
      initialsEntry = { ...initialsEntry, selectedSlot: slot };
      initialsEntry = updateInitialsEntry(initialsEntry, { keyPresses: [], slotDelta: 0, charDelta: 1 });
    } else if (y < -105 && x < 0) {
      initialsEntry = updateInitialsEntry(initialsEntry,
        { keyPresses: ["Backspace"], slotDelta: 0, charDelta: 0 });
    } else if (y < -105 && x >= 0) submitInitials();
  }
}

function handleSettingsGamepad(time: number, gamepad: Gamepad | undefined): void {
  if (!settingsOpen) return;

  const buttonDown = (index: number) => gamepad?.buttons[index]?.pressed ?? false;
  const axesNeutral = [0, 1, 2, 3].every((axis) => Math.abs(gamepad?.axes[axis] ?? 0) <= 0.2);
  const buttonsNeutral = Array.from(gamepad?.buttons ?? []).every((button) => !button.pressed);
  if (settingsNeedsGamepadNeutral && (!gamepad || (axesNeutral && buttonsNeutral))) {
    settingsNeedsGamepadNeutral = false;
  }
  if (settingsNeedsGamepadNeutral || !gamepad) return;

  const isNewPress = (index: number) => buttonDown(index) && !previousSettingsButtons.has(index);
  if (isNewPress(1)) closeSettings();
  else if (isNewPress(0) && settings.activateSelection() === "close") closeSettings();
  if (settingsOpen && isNewPress(3)) settings.resetDisplay();

  const vertical = buttonDown(13) ? 1 : buttonDown(12) ? -1
    : Math.abs(gamepad.axes[1] ?? 0) > 0.45 ? Math.sign(gamepad.axes[1]!) : 0;
  const horizontal = buttonDown(15) ? 1 : buttonDown(14) ? -1
    : Math.abs(gamepad.axes[0] ?? 0) > 0.45 ? Math.sign(gamepad.axes[0]!) : 0;
  if (settingsOpen && time >= settingsNavAt && vertical) {
    settings.moveSelection(vertical);
    settingsNavAt = time + 220;
  } else if (settingsOpen && time >= settingsNavAt && horizontal) {
    settings.adjustSelection(horizontal);
    settingsNavAt = time + 160;
  }
}

function rememberSettingsGamepadButtons(gamepad: Gamepad | undefined): void {
  const buttonDown = (index: number) => gamepad?.buttons[index]?.pressed ?? false;
  previousSettingsButtons = new Set([0, 1, 3, 8, 9, 12, 13, 14, 15].filter(buttonDown));
}

function line(context: DrawingContext, points: readonly Point[], color: Color, intensity = 1): void {
  context.setColor(color); context.setIntensity(intensity); drawPolygonOutline(context, points);
}

const sceneClip = { left: -ROOM.width / 2 - 4, right: ROOM.width / 2 + 4,
  bottom: roomCenterY - ROOM.height / 2 - 4, top: roomCenterY + ROOM.height / 2 + 4 };
const wallCache = new WeakMap<RoomView["walls"], [number, number, number, number][]>();
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}
const titleMaze = createMaze(seededRandom(1));
const titleRoomGeometry = createRoomGeometry("left");
const titleWalls = [...titleMaze.walls, ...titleRoomGeometry.hazardRects];
const titleWallEdges = wallOutline(titleWalls.filter((wall) => wall !== titleRoomGeometry.closedDoorRect));

function isClosedDoor(wall: RoomView["walls"][number], room: RoomView): boolean {
  const door = room.geometry.closedDoorRect;
  return wall.x === door.x && wall.y === door.y && wall.width === door.width && wall.height === door.height;
}

function drawWalls(context: DrawingContext, room: RoomView, time: number, doorProgress: number): void {
  let edges = wallCache.get(room.walls);
  if (!edges) {
    // The closed door is drawn as an amber bar, like the original preview.
    const visibleWalls = room.walls.filter((wall) => !isClosedDoor(wall, room));
    edges = wallOutline(visibleWalls);
    wallCache.set(room.walls, edges);
  }
  const pulse = reducedMotion.matches ? 1.05 : 1.05 + 0.28 * Math.sin(time * 0.003);
  context.setColor(blue); context.setIntensity(pulse);
  for (const [x1, y1, x2, y2] of edges) {
    context.moveTo(x1, y1); context.lineTo(x2, y2);
  }
  for (const door of room.geometry.doors) {
    if (!door.doorLine) continue;
    const { x, y, width, height } = room.geometry.closedDoorRect;
    if (doorProgress >= 1) {
      line(context, [[x,y],[x+width,y],[x+width,y+height],[x,y+height]], amber);
      const [x1, y1, x2, y2] = door.doorLine;
      context.moveTo(x1, y1); context.lineTo(x2, y2);
    } else if (doorProgress > 0) {
      if (width > height) {
        const panel = width * doorProgress / 2;
        line(context, [[x,y],[x+panel,y],[x+panel,y+height],[x,y+height]], amber);
        line(context, [[x+width-panel,y],[x+width,y],[x+width,y+height],[x+width-panel,y+height]], amber);
      } else {
        const panel = height * doorProgress / 2;
        line(context, [[x,y],[x+width,y],[x+width,y+panel],[x,y+panel]], amber);
        line(context, [[x,y+height-panel],[x+width,y+height-panel],[x+width,y+height],[x,y+height]], amber);
      }
    }
  }
}

function drawPlayer(context: DrawingContext, room: RoomView): void {
  const { x, y } = room.player;
  context.pushTransform();
  context.translate(x, y);
  context.scale(1.18, 1.18);
  const stride = walking ? Math.sin(gameView.elapsed * 14) * 3 : 0;
  context.setColor(cyan); context.setIntensity(1);
  drawCircle(context, [0, -8], 6);
  context.setColor(white); context.setIntensity(0.85);
  context.point(-2, -8); context.point(2, -8);
  line(context, [[-5,-1],[5,-1],[6,8],[-6,8]], cyan);
  context.setColor(cyan); context.setIntensity(0.9);
  context.moveTo(-3, 8); context.lineTo(-4-stride, 14);
  context.moveTo(3, 8); context.lineTo(4+stride, 14);
  const gunSide = aim.x < 0 ? -1 : 1;
  const shoulderX = gunSide * 6;
  const shoulderY = -1;
  const handX = shoulderX + aim.x * 6;
  const handY = shoulderY + aim.y * 6;
  context.moveTo(-gunSide * 5, 1);
  context.lineTo(-gunSide * 9, 5);
  context.moveTo(shoulderX, shoulderY);
  context.lineTo(handX, handY);
  context.setColor(amber); context.setIntensity(1.1);
  context.moveTo(handX, handY);
  context.lineTo(handX + aim.x * 6, handY + aim.y * 6);
  context.popTransform();
}

function drawCaptain(context: DrawingContext, room: RoomView): void {
  const captain = room.captain;
  if (captain.state !== "chasing") return;
  const bounce = reducedMotion.matches ? 0 : Math.sin(captain.bouncePhase) * 2;
  context.pushTransform();
  context.translate(captain.x, captain.y + bounce);
  context.scale(captain.radius / 14, captain.radius / 14);
  // Keep the robot-head silhouette, enlarged and with the Captain's steel finish.
  line(context, [[-14,-11],[14,-11],[14,8],[7,8],[7,16],[-7,16],[-7,8],[-14,8]], captainSteel, 1.2);
  context.setColor(captainEyes); context.setIntensity(1);
  context.point(-6,-3); context.point(6,-3);
  context.popTransform();
}

function drawParticleBurst(context: DrawingContext, burst: typeof particleEffects.items[number]): void {
  const opacity = particleEffectOpacity(burst);
  if (opacity <= 0) return;
  context.setColor(burst.color);
  context.setIntensity(1.4 * opacity);
  for (const mark of burst.marks) {
    const offset = particleMarkOffset(mark, burst, reducedMotion.matches);
    const halfLength = mark.length / 2;
    const dx = Math.cos(mark.angle) * halfLength;
    const dy = Math.sin(mark.angle) * halfLength;
    const x = burst.x + offset.x;
    const y = burst.y + offset.y;
    context.moveTo(x - dx, y - dy);
    context.lineTo(x + dx, y + dy);
  }
}

function drawRoomCaptain(room: RoomView, offsetX: number, offsetY: number): void {
  const roomBounds = {
    left: offsetX - ROOM.width / 2,
    right: offsetX + ROOM.width / 2,
    bottom: roomCenterY + offsetY - ROOM.height / 2,
    top: roomCenterY + offsetY + ROOM.height / 2,
  };
  const bounds = intersectClipBounds(sceneClip, roomBounds);
  if (!bounds) return;
  // This wrapper targets the base drawing context, so bounds are in scene coordinates.
  const captainScene = clippedDrawing(drawing, bounds);
  captainScene.pushTransform();
  captainScene.translate(offsetX, roomCenterY + offsetY);
  captainScene.scale(1, -1);
  captainScene.translate(-ROOM.width / 2, -ROOM.height / 2);
  drawCaptain(captainScene, room);
  captainScene.popTransform();
}

function drawRoom(room: RoomView, time: number, offsetX = 0, offsetY = 0, doorProgress = 1, showPlayer = true): void {
  const scene = clippedDrawing(drawing, sceneClip);
  scene.pushTransform();
  scene.translate(offsetX, roomCenterY + offsetY);
  scene.scale(1, -1);
  scene.translate(-ROOM.width / 2, -ROOM.height / 2);
  drawWalls(scene, room, time, doorProgress);
  for (const robot of room.robots) {
    const stride = walkingRobots.has(robot.id) ? Math.sin(gameView.elapsed * 14 + robot.id * 0.73) * 4 : 0;
    const gaze = robotGaze.get(robot.id) ?? { x: 0, y: 0 };
    drawCharacterRobot(scene, robot.x, robot.y, robotVisualScale, robotColors[room.difficulty.color], -1, stride, gaze.x, -gaze.y);
  }
  if (showPlayer && gameView.outcome === "playing") drawPlayer(scene, room);
  for (const shot of room.shots) {
    const length = Math.hypot(shot.velocityX, shot.velocityY) || 1;
    scene.setColor(shot.owner === "player" ? cyan : amber); scene.setIntensity(1.4);
    scene.moveTo(shot.x, shot.y);
    scene.lineTo(shot.x - shot.velocityX / length * 10, shot.y - shot.velocityY / length * 10);
  }
  // The target scene wrapper accepts room coordinates before applying its room transform.
  const roomEffectsScene = clippedDrawing(scene, { left: 0, right: ROOM.width, bottom: 0, top: ROOM.height });
  for (let index = 0; index < scoreFlyups.items.length; index += 1) {
    const flyup = scoreFlyups.items[index];
    if (flyup.roomX !== room.roomX || flyup.roomY !== room.roomY) continue;
    const nearbyCount = scoreFlyups.items.slice(0, index).filter((other) => other.roomX === flyup.roomX
      && other.roomY === flyup.roomY && other.age < 0.3
      && Math.hypot(other.x - flyup.x, other.y - flyup.y) < 38).length;
    const fan = nearbyCount === 0 ? 0 : (nearbyCount % 2 === 1 ? 1 : -1) * Math.ceil(nearbyCount / 2) * 18;
    const value = String(flyup.points);
    const options = { ...textOptions, height: 16 } as const;
    const x = flyup.x + fan - measureText(value, options).width / 2;
    roomEffectsScene.setColor(robotColors[flyup.color]);
    roomEffectsScene.setIntensity(1.15 * scoreFlyupOpacity(flyup));
    drawText(roomEffectsScene, value, x,
      flyup.y - SCORE_FLYUP_START_OFFSET + scoreFlyupRise(flyup, reducedMotion.matches), options);
  }
  for (const burst of particleEffects.items) {
    if (burst.roomX === room.roomX && burst.roomY === room.roomY) drawParticleBurst(roomEffectsScene, burst);
  }
  scene.popTransform();
  drawRoomCaptain(room, offsetX, offsetY);
}

function drawCharacterRobot(
  context: DrawingContext,
  x: number,
  y: number,
  scale: number,
  color: Color,
  verticalDirection = 1,
  stride = 0,
  gazeX = 0,
  gazeY = 0,
): void {
  context.pushTransform();
  context.translate(x, y);
  context.scale(scale, scale * verticalDirection);
  line(context, [[-11,15],[-15,24],[-10,35],[10,35],[15,24],[11,15]], color, 0.9);
  line(context, [[-15,13],[15,13],[18,-9],[11,-15],[-11,-15],[-18,-9]], color, 0.9);
  context.setColor(amber); context.setIntensity(1.1);
  context.point(-6 + gazeX * 2.5, 25 + gazeY * 2.5);
  context.point(6 + gazeX * 2.5, 25 + gazeY * 2.5);
  context.setColor(color); context.setIntensity(0.9);
  context.moveTo(-11, -12); context.lineTo(-15 - stride * 0.35, -25); context.lineTo(-8 - stride, -29);
  context.moveTo(11, -12); context.lineTo(15 + stride * 0.35, -25); context.lineTo(8 + stride, -29);
  context.moveTo(-16, 7); context.lineTo(-25 + stride * 0.35, 0); context.lineTo(-22 + stride, -8);
  context.moveTo(16, 7); context.lineTo(25 - stride * 0.35, 0); context.lineTo(22 - stride, -8);
  context.popTransform();
}

function drawTitleVignette(): void {
  drawing.pushTransform();
  drawing.translate(0, 70);
  drawing.scale(0.5, -0.5);
  drawing.translate(-ROOM.width / 2, -ROOM.height / 2);

  drawing.setColor(blue); drawing.setIntensity(1.05);
  for (const [x1, y1, x2, y2] of titleWallEdges) {
    drawing.moveTo(x1, y1); drawing.lineTo(x2, y2);
  }
  const door = titleRoomGeometry.closedDoorRect;
  line(drawing, [[door.x, door.y], [door.x + door.width, door.y],
    [door.x + door.width, door.y + door.height], [door.x, door.y + door.height]], amber);
  const doorLine = titleRoomGeometry.doors.find((entry) => entry.doorLine)?.doorLine;
  if (doorLine) {
    drawing.setColor(amber); drawing.setIntensity(0.95);
    drawing.moveTo(doorLine[0], doorLine[1]); drawing.lineTo(doorLine[2], doorLine[3]);
  }

  const hostile = robotColors.red;
  const hostileScale = 0.8;
  drawCharacterRobot(drawing, 700, 300, hostileScale, hostile, -1, 0, -0.8, 0);
  drawCharacterRobot(drawing, 300, 100, hostileScale, hostile, -1, 0, -0.7, 0.7);
  drawCharacterRobot(drawing, 900, 100, hostileScale, hostile, -1, 0, -0.8, 0.2);
  drawCharacterRobot(drawing, 500, 500, hostileScale, hostile, -1, 0, -0.6, -0.6);
  drawTitlePlayer(75, 300, 1.5);

  drawing.setColor(cyan); drawing.setIntensity(1.2);
  for (const x of [180, 390, 600]) {
    drawing.moveTo(x, 300); drawing.lineTo(x + 24, 300);
  }
  drawing.setColor(amber); drawing.setIntensity(1.2);
  for (const [x, y] of [[280, 118], [245, 150]]) {
    drawing.moveTo(x, y); drawing.lineTo(x - 12, y + 11);
  }
  drawing.popTransform();
}

function drawTitlePlayer(x: number, y: number, scale: number): void {
  drawing.pushTransform();
  drawing.translate(x, y);
  drawing.scale(scale, scale);
  drawing.setColor(cyan); drawing.setIntensity(1);
  drawCircle(drawing, [0, -8], 6);
  drawing.setColor(white); drawing.setIntensity(0.85);
  drawing.point(-2, -8); drawing.point(2, -8);
  line(drawing, [[-5,-1],[5,-1],[6,8],[-6,8]], cyan);
  drawing.setColor(cyan); drawing.setIntensity(0.9);
  drawing.moveTo(-3, 8); drawing.lineTo(-4, 14);
  drawing.moveTo(3, 8); drawing.lineTo(4, 14);
  drawing.moveTo(-5, 1); drawing.lineTo(-9, 5);
  drawing.moveTo(5, -1); drawing.lineTo(10, 2);
  drawing.setColor(amber); drawing.setIntensity(1.1);
  drawing.moveTo(10, 2); drawing.lineTo(19, 3);
  drawing.popTransform();
}

function menuText(text: string, x: number, y: number, color: Color, height = 17): void {
  drawing.setColor(color); drawing.setIntensity(0.95);
  drawText(drawing, text, x, y, { ...textOptions, height });
}

function drawBrand(time: number, y: number): void {
  const options = { font: "segment16", height: 24, spacing: "kerned" } as const;
  const prefix = "ONE MORE ";
  const glow = "GLOW";
  const brandWidth = measureText(`${prefix}${glow}`, options).width;
  const x = -brandWidth / 2;
  drawing.setColor(white); drawing.setIntensity(0.9);
  drawText(drawing, prefix, x, y, options);
  const pulse = reducedMotion.matches ? 0 : (1 + Math.sin(time * Math.PI * 2 / 3000)) / 2;
  drawing.setColor([
    white[0] + (amber[0] - white[0]) * pulse,
    white[1] + (amber[1] - white[1]) * pulse,
    white[2] + (amber[2] - white[2]) * pulse,
  ]);
  drawing.setIntensity(1 + 0.3 * pulse);
  drawText(drawing, glow, x + measureText(prefix, options).width, y, options);
}

function drawGameTitle(y: number, height: number): void {
  const options = { font: "segment16", height, spacing: "kerned" } as const;
  const title = "VERY ANGRY ROBOTS";
  drawing.setColor(amber); drawing.setIntensity(1.25);
  drawText(drawing, title, -measureText(title, options).width / 2, y, options);
}

function drawAttractScreen(time: number): void {
  drawing.beginFrame();
  if (screenFlow.screen === "main-menu") {
    drawBrand(time, 326);
    drawGameTitle(242, 46);
    drawTitleVignette();

    menuText("KEYBOARD", -330, -139, cyan, 15);
    menuText("WASD MOVE   ARROWS FIRE", -330, -166, white);
    menuText("ENTER START   P PAUSE", -330, -192, white);
    menuText("GAMEPAD", 55, -139, cyan, 15);
    menuText("LEFT STICK MOVE   RIGHT STICK FIRE", 55, -166, white);
    menuText("START PLAY / PAUSE", 55, -192, white);
    label("TAP OR PRESS ENTER / START TO PLAY", attractPromptY.play, amber);
    label("TAP OR MOVE TO VIEW TOP SCORES", attractPromptY.navigation, white);
    label("TAP HERE OR PRESS S / BACK FOR SETTINGS", attractPromptY.settings, blue);
  } else if (screenFlow.screen === "initials") {
    label("NEW HIGH SCORE", 150, amber);
    label("ENTER UP TO THREE INITIALS", 75, white);
    initialsEntry.characters.forEach((initial, index) => {
      const x = -28 + index * 28;
      const value = initial || "_";
      drawing.setColor(index === initialsEntry.selectedSlot ? amber : white);
      drawing.setIntensity(1);
      drawText(drawing, value, x - measureText(value, textOptions).width / 2, 0, textOptions);
      if (index === initialsEntry.selectedSlot) {
        drawing.moveTo(x - 8, -12);
        drawing.lineTo(x + 8, -12);
      }
    });
    label("TAP AN INITIAL TO SELECT AND CHANGE IT", -55, white);
    label("BACKSPACE CORRECTS - TAP LOWER LEFT TO CLEAR", -80, white);
    label("ENTER / START OR TAP LOWER RIGHT TO SUBMIT", -125, white);
  } else {
    drawBrand(time, 326);
    drawGameTitle(242, 46);
    label("TOP SCORES", 178, amber);
    drawing.setColor(white); drawing.setIntensity(0.7);
    drawText(drawing, "RANK", -300, 123, textOptions);
    drawText(drawing, "INITIALS", -90, 123, textOptions);
    drawText(drawing, "SCORE", 150, 123, textOptions);
    if (highScores.length === 0) label("NO SCORES YET", 43, white);
    highScores.forEach((entry, index) => {
      const y = 83 - index * 28;
      const isNewEntry = index === highlightedHighScoreIndex;
      drawing.setColor(isNewEntry ? amber : white); drawing.setIntensity(isNewEntry ? 1.3 : 1);
      if (isNewEntry) {
        drawText(drawing, "NEW", -240, y, { ...textOptions, height: 13 });
      }
      drawText(drawing, String(index + 1).padStart(2, "0"), -300, y, textOptions);
      if (entry.initials) drawText(drawing, entry.initials, -90, y, textOptions);
      const value = String(entry.score);
      drawText(drawing, value, 150, y, textOptions);
    });
    label("TAP OR PRESS ENTER / START TO PLAY", attractPromptY.play, amber);
    label("TAP OR MOVE TO RETURN TO MAIN MENU", attractPromptY.navigation, white);
    label("TAP HERE OR PRESS S / BACK FOR SETTINGS", attractPromptY.settings, blue);
  }
  drawing.endFrame();
}

function draw(time: number, wallClockTime: number): void {
  if (settingsOpen) {
    settings.draw();
    return;
  }
  if (screenFlow.screen !== "playing") {
    drawAttractScreen(wallClockTime);
    return;
  }

  drawing.beginFrame();
  drawing.setColor(white); drawing.setIntensity(0.7);
  drawText(drawing, "VERY ANGRY ROBOTS", -440, 350, { ...textOptions, height: 16 });
  const hudOptions = { ...textOptions, height: 16 };
  const score = `SCORE ${gameView.score}`;
  drawText(drawing, score, -190, 350, hudOptions);
  const lives = `LIVES ${gameView.lives}`;
  drawText(drawing, lives, 70, 350, hudOptions);
  const robotCount = `ROBOTS ${gameView.robots.length}`;
  drawText(drawing, robotCount, 440 - measureText(robotCount, hudOptions).width, 350, hudOptions);
  drawText(drawing, "TAP TOP RIGHT TO PAUSE", 265, 316, { ...textOptions, height: 12 });

  const transition = gameView.transition;
  if (transition) {
    const elapsed = transition.progress * transition.duration;
    const scrollProgress = reducedMotion.matches ? 1 : Math.min(1, elapsed / ROOM_SCROLL_DURATION);
    const doorProgress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (elapsed - ROOM_SCROLL_DURATION) / DOOR_CLOSE_DURATION));
    const offsets = transitionOffsets(transition.direction, scrollProgress);
    retainPresentedRoomFlyups(scoreFlyups, [transition.from, transition.to]);
    retainPresentedRoomParticleEffects(particleEffects, [transition.from, transition.to]);
    drawRoom(transition.from, time, offsets.from.x, offsets.from.y, 1, false);
    drawRoom(transition.to, time, offsets.to.x, offsets.to.y, doorProgress);
  } else {
    retainPresentedRoomFlyups(scoreFlyups, [gameView]);
    retainPresentedRoomParticleEffects(particleEffects, [gameView]);
    drawRoom(gameView, time);
  }

  if (gameView.outcome === "dying") {
    label("PLAYER DOWN", roomCenterY + 12, red);
    if (gameView.lives > 0) {
      const seconds = Math.max(0, gameView.deathTimeRemaining).toFixed(1);
      label(`RESPAWNING IN ${seconds}`, roomCenterY - 14, amber);
    }
  }
  if (paused) {
    drawing.setColor([0.02, 0.035, 0.06]); drawing.setIntensity(0.72);
    drawing.moveTo(-480, 175); drawing.lineTo(480, 175);
    drawing.moveTo(-480, -175); drawing.lineTo(480, -175);
    label("PAUSED", 84, amber);
    label("TAP HERE OR PRESS P / START TO RESUME", 24, white);
    label("S / BACK OR SELECT: SETTINGS", -36, blue);
  }
  drawing.endFrame();
}

window.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  audio.unlock();
  if (settingsOpen) {
    event.preventDefault();
    input.blockKey(event.key);
    if (event.key === "Escape") { if (!event.repeat) closeSettings(); }
    else if (event.key === "Tab") settings.moveSelection(event.shiftKey ? -1 : 1);
    else if (event.key === "ArrowUp") settings.moveSelection(-1);
    else if (event.key === "ArrowDown") settings.moveSelection(1);
    else if (event.key === "ArrowLeft") settings.adjustSelection(-1);
    else if (event.key === "ArrowRight") settings.adjustSelection(1);
    else if (event.key === "Enter" && !event.repeat && settings.activateSelection() === "close") closeSettings();
    return;
  }
  if (input.keyDown(event.key, event.repeat)) event.preventDefault();
});
window.addEventListener("keyup", (event) => input.keyUp(event.key));
screen.addEventListener("pointerdown", (event) => {
  audio.unlock();
  if (settingsOpen) {
    event.preventDefault();
    screen.setPointerCapture(event.pointerId);
    if (settings.pointer(settingsPointerPosition(event)) === "close") closeSettings();
    return;
  }

  event.preventDefault();
  const position = canvasGamePosition(event);
  const screenAtDown = screenFlow.screen;
  if (screenAtDown !== "playing") {
    touchActionAt(position);
    return;
  }

  const pauseAction = (!paused && position[0] >= 350 && position[1] >= 285)
    || (paused && ((Math.abs(position[0]) <= 300 && position[1] >= -10 && position[1] <= 90)
      || (position[1] >= -58 && position[1] <= -15)));
  if (pauseAction) {
    touchActionAt(position);
    return;
  }
  // Gameplay movement and aiming are accepted only on the visible stick surfaces.
});
gameElement.addEventListener("pointerdown", (event) => {
  const target = (event.target as Element | null)?.closest<HTMLElement>("[data-touch-stick]");
  if (!target || screenFlow.screen !== "playing" || paused || settingsOpen) return;
  event.preventDefault();
  audio.unlock();
  const stick = target.dataset.touchStick;
  if (stick !== "move" && stick !== "aim") return;
  const ring = target.querySelector<HTMLElement>(".stick-ring");
  if (!ring) return;
  const rect = ring.getBoundingClientRect();
  const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.38);
  if (!touchInput.pointerDown(stick, event.pointerId, 0, 0)) return;
  touchPointerOrigins.set(event.pointerId, {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    radius,
    target,
  });
  target.setPointerCapture(event.pointerId);
});
gameElement.addEventListener("pointermove", (event) => {
  if (settingsOpen && event.buttons) {
    if (settings.pointer(settingsPointerPosition(event), false) === "close") closeSettings();
    return;
  }
  const origin = touchPointerOrigins.get(event.pointerId);
  if (!origin) return;
  event.preventDefault();
  const dx = (event.clientX - origin.x) / origin.radius;
  const dy = (event.clientY - origin.y) / origin.radius;
  touchInput.pointerMove(event.pointerId, dx, dy);
  const length = Math.hypot(dx, dy);
  const scale = length > 1 ? 1 / length : 1;
  origin.target.style.setProperty("--thumb-x", `${dx * scale * origin.radius * 0.55}px`);
  origin.target.style.setProperty("--thumb-y", `${dy * scale * origin.radius * 0.55}px`);
});
function releasePointer(event: PointerEvent): void {
  const origin = touchPointerOrigins.get(event.pointerId);
  if (origin) {
    touchPointerOrigins.delete(event.pointerId);
    touchInput.pointerUp(event.pointerId);
    origin.target.style.setProperty("--thumb-x", "0px");
    origin.target.style.setProperty("--thumb-y", "0px");
    if (origin.target.hasPointerCapture(event.pointerId)) origin.target.releasePointerCapture(event.pointerId);
  }
  if (screen.hasPointerCapture(event.pointerId)) screen.releasePointerCapture(event.pointerId);
}
gameElement.addEventListener("pointerup", releasePointer);
gameElement.addEventListener("pointercancel", releasePointer);
gameElement.addEventListener("lostpointercapture", (event) => {
  const origin = touchPointerOrigins.get(event.pointerId);
  touchPointerOrigins.delete(event.pointerId);
  touchInput.pointerUp(event.pointerId);
  origin?.target.style.setProperty("--thumb-x", "0px");
  origin?.target.style.setProperty("--thumb-y", "0px");
});
function pauseForFocusLoss(): void {
  clearTouchInput();
  input.clearKeyboard();
  latestGamepadState = readGamepadState(findStandardGamepad());
  input.suppressGamepadWhileHeld(latestGamepadState);
  ({ paused, settingsOpen } = focusLossOverlayState(screenFlow.screen, paused, settingsOpen));
}
window.addEventListener("blur", pauseForFocusLoss);
document.addEventListener("visibilitychange", () => { if (document.hidden) pauseForFocusLoss(); });
function resize(): void {
  const rect = screen.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  screen.width = Math.max(1, Math.round(rect.width * ratio));
  screen.height = Math.max(1, Math.round(rect.height * ratio));
}
window.addEventListener("resize", resize);
const canvasResizeObserver = new ResizeObserver(resize);
canvasResizeObserver.observe(screen);
resize();
let lastTime = 0;
let sceneTime = 0;
interface FrameInput {
  gamepad: Gamepad | undefined;
  controls: InputState;
  fire: boolean;
}

function findStandardGamepad(): Gamepad | undefined {
  const gamepad = Array.from(navigator.getGamepads?.() ?? [])
    .find((candidate) => candidate?.connected && candidate.mapping === "standard");
  return gamepad ?? undefined;
}

function readGamepadState(gamepad: Gamepad | undefined): GamepadState | undefined {
  if (!gamepad) return undefined;
  return {
    leftX: gamepad.axes[0] ?? 0,
    leftY: gamepad.axes[1] ?? 0,
    rightX: gamepad.axes[2] ?? 0,
    rightY: gamepad.axes[3] ?? 0,
    startPressed: gamepad.buttons[9]?.pressed ?? false,
    backPressed: gamepad.buttons[8]?.pressed ?? false,
  };
}

function readFrameInput(): FrameInput {
  const gamepad = findStandardGamepad();
  latestGamepadState = readGamepadState(gamepad);
  const controls = input.read(latestGamepadState);
  const touch = touchInput.read();
  const keyboardOrGamepadAim = controls.aim.x !== 0 || controls.aim.y !== 0;
  return {
    gamepad,
    controls: {
      ...controls,
      move: touch.move.x || touch.move.y ? touch.move : controls.move,
      aim: touch.fire || !keyboardOrGamepadAim ? touch.aim : controls.aim,
    },
    fire: touch.fire || keyboardOrGamepadAim,
  };
}

function updateFrameAudioAndSceneTime(delta: number): void {
  audio.setGameplayState(screenFlow.screen === "playing", paused || settingsOpen);
  audio.update(delta);
  if (shouldAdvanceSceneTime(screenFlow.screen, paused, settingsOpen)) sceneTime += delta * 1000;
}

function handleOverlayInput(time: number, frameInput: FrameInput): boolean {
  if (settingsOpen) {
    handleSettingsGamepad(time, frameInput.gamepad);
    return true;
  }
  if (frameInput.controls.settingsPressed && canOpenSettings()) {
    openSettings();
    return true;
  }
  if (screenFlow.screen === "playing" && frameInput.controls.pausePressed) {
    paused = !paused;
    input.clearKeyboard();
    input.suppressGamepadWhileHeld(latestGamepadState);
    clearTouchInput();
    return true;
  }
  return false;
}

function playGameEventAudio(events: readonly GameEvent[], enteredTransition: boolean): void {
  const audioActions = gameAudioActions(events);
  if (audioActions.stopTaunts) audio.stopTaunts();
  else if (enteredTransition) audio.stopTaunts();
  if (audioActions.tauntSet) runTauntSet = audioActions.tauntSet;
  if (audioActions.effects.length) audio.playEffects(audioActions.effects);
  for (const voice of audioActions.voices) audio.playVoice(voice);
  if (events.some((event) => event.type === "room-entered" || event.type === "player-respawned")) {
    audio.startTaunts(runTauntSet);
  }
}

function updateRobotMovementPresentation(
  previousPositions: ReadonlyMap<number, { x: number; y: number }>,
): void {
  walkingRobots = gameView.transition ? new Set() : new Set(gameView.robots
    .filter((robot) => {
      const previous = previousPositions.get(robot.id);
      return previous !== undefined && Math.hypot(robot.x - previous.x, robot.y - previous.y) > 0.001;
    })
    .map((robot) => robot.id));
  robotGaze = new Map(gameView.robots.map((robot) => {
    const previous = previousPositions.get(robot.id);
    const dx = previous ? robot.x - previous.x : 0;
    const dy = previous ? robot.y - previous.y : 0;
    const distance = Math.hypot(dx, dy);
    const previousGaze = robotGaze.get(robot.id) ?? { x: 0, y: 0 };
    return [robot.id, distance > 0.001
      ? { x: dx / distance, y: dy / distance }
      : previousGaze];
  }));
}

function addGameEventEffects(events: readonly GameEvent[]): void {
  for (const event of events) {
    if (event.type === "robot-destroyed") addScoreFlyup(scoreFlyups, event);
    addParticleEffect(particleEffects, event);
  }
}

function finishLostRun(): void {
  clearTouchInput();
  screenFlow = updateScreenFlow(screenFlow, {
    type: "run-ended",
    score: gameView.score,
    qualifies: qualifiesForHighScore(highScores, gameView.score),
  });
  initialsEntry = createInitialsEntry();
}

function advanceGameFrame(delta: number, controls: InputState, fire: boolean): void {
  if (!gameView.transition && (controls.aim.x || controls.aim.y)) aim = controls.aim;
  const previousX = gameView.player.x;
  const previousY = gameView.player.y;
  const previousRobotPositions = new Map(gameView.robots.map((robot) => [robot.id, { x: robot.x, y: robot.y }]));
  const simulationDelta = reducedMotion.matches && gameView.transition ? gameView.transition.duration : delta;
  const wasInTransition = gameView.transition !== null;
  const events = updateGame(game, simulationDelta, {
    moveX: controls.move.x,
    moveY: controls.move.y,
    aimX: controls.aim.x,
    aimY: controls.aim.y,
    fire,
    restartPressed: false,
  });

  playGameEventAudio(events, !wasInTransition && gameView.transition !== null);
  updateRobotMovementPresentation(previousRobotPositions);
  addGameEventEffects(events);
  updateScoreFlyups(scoreFlyups, delta, reducedMotion.matches);
  updateParticleEffects(particleEffects, delta, reducedMotion.matches);
  walking = !gameView.transition && gameView.outcome === "playing"
    && (gameView.player.x !== previousX || gameView.player.y !== previousY);
  if (gameView.outcome === "lost") finishLostRun();
}

function submitInitials(): void {
  const submittedInitials = initialsEntry.characters.join("");
  const finalScore = screenFlow.runScore;
  if (finalScore !== null) {
    const lowerScoreIndex = highScores.findIndex((entry) => entry.score < finalScore);
    highlightedHighScoreIndex = lowerScoreIndex < 0 ? highScores.length : lowerScoreIndex;
    highScores = insertHighScore(highScores, { initials: submittedInitials, score: finalScore });
    saveHighScores(() => window.localStorage, highScores);
  }
  screenFlow = updateScreenFlow(screenFlow, { type: "initials-submitted", initials: submittedInitials });
  input.suppressGamepadWhileHeld(latestGamepadState);
  clearTouchInput();
}

function startRun(): void {
  clearTouchInput();
  highlightedHighScoreIndex = null;
  restartGame(game);
  clearScoreFlyups(scoreFlyups);
  clearParticleEffects(particleEffects);
  initialsEntry = createInitialsEntry();
  screenFlow = updateScreenFlow(screenFlow, { type: "start-run" });
  runTauntSet = "standard";
  audio.setGameplayState(true, false);
  audio.playEffects(["interface"]);
  audio.startTaunts(runTauntSet);
}

function advanceScreenFlowFrame(delta: number, controls: InputState): void {
  if (screenFlow.screen === "initials") {
    initialsEntry = updateInitialsEntry(initialsEntry, {
      keyPresses: controls.keyPresses,
      slotDelta: controls.initialsSlotDelta,
      charDelta: controls.initialsCharDelta,
    });
    if (controls.startPressed) submitInitials();
  } else if (screenFlow.screen !== "playing" && controls.startPressed) {
    startRun();
  } else if (screenFlow.screen !== "playing" && controls.screenAdvancePressed) {
    screenFlow = updateScreenFlow(screenFlow, { type: "advance" });
    audio.playEffects(["interface"]);
  } else if (shouldTickAttractScreen(screenFlow.screen, settingsOpen)) {
    screenFlow = updateScreenFlow(screenFlow, { type: "tick", elapsedMs: delta * 1000 });
  }
}

function frame(time: number): void {
  const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
  lastTime = time;
  const frameInput = readFrameInput();
  const { controls } = frameInput;

  if (controls.startPressed || controls.screenAdvancePressed || controls.pausePressed || controls.settingsPressed) {
    audio.unlock();
  }
  updateFrameAudioAndSceneTime(delta);

  if (!handleOverlayInput(time, frameInput)) {
    if (shouldAdvanceGame(screenFlow.screen, paused, settingsOpen)) advanceGameFrame(delta, controls, frameInput.fire);
    else advanceScreenFlowFrame(delta, controls);
  }

  rememberSettingsGamepadButtons(frameInput.gamepad);
  draw(sceneTime, time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
