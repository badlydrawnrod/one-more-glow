import { createWebGL2Renderer, drawCircle, drawPolygonOutline, drawText, measureText,
  type Color, type DrawingContext, type Point } from "one-more-glow";
import { createGame, updateGame, ROOM, ROOM_SCROLL_DURATION, DOOR_CLOSE_DURATION, type RoomSnapshot, type RobotColor } from "./game.ts";
import { wallOutline } from "./wall-outline.ts";
import { InputController } from "./input.ts";
import { clippedDrawing, intersectClipBounds } from "./clipped-drawing.ts";
import { transitionOffsets } from "./transition-presentation.ts";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#screen");
if (!canvas) throw new Error("Missing game canvas");
const screen = canvas;
const gl = screen.getContext("webgl2");
if (!gl) throw new Error("WebGL2 is unavailable");
const drawing = createWebGL2Renderer(gl);
const game = createGame();
const input = new InputController();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let started = false;
let aim = { x: 1, y: 0 };
let walking = false;
const cyan: Color = [0.35, 0.95, 1];
const red: Color = [1, 0.35, 0.36];
const amber: Color = [1, 0.75, 0.32];
const robotColors: Record<RobotColor, Color> = {
  "dark yellow": [0.85, 0.65, 0.12], red: [1, 0.35, 0.36],
  "dark cyan": [0.12, 0.7, 0.7], green: [0.3, 0.95, 0.35],
  "dark purple": [0.65, 0.3, 0.85], "light yellow": [1, 0.95, 0.5],
  white: [1, 1, 1], "light purple": [0.85, 0.6, 1], grey: [0.7, 0.7, 0.7],
};
const blue: Color = [0.28, 0.63, 1];
const white: Color = [0.8, 0.96, 1];
const captainSteel: Color = [0.72, 0.82, 1];
const captainEyes: Color = [1, 0.25, 0.2];
const roomCenterY = -60;
const textOptions = { font: "segment22", height: 19, spacing: "kerned" } as const;

function label(text: string, y: number, color: Color = white): void {
  drawing.setColor(color); drawing.setIntensity(1);
  drawText(drawing, text, -measureText(text, textOptions).width / 2, y, textOptions);
}

function line(context: DrawingContext, points: readonly Point[], color: Color, intensity = 1): void {
  context.setColor(color); context.setIntensity(intensity); drawPolygonOutline(context, points);
}

const sceneClip = { left: -ROOM.width / 2 - 4, right: ROOM.width / 2 + 4,
  bottom: roomCenterY - ROOM.height / 2 - 4, top: roomCenterY + ROOM.height / 2 + 4 };
const wallCache = new WeakMap<RoomSnapshot["walls"], [number, number, number, number][]>();

function isClosedDoor(wall: RoomSnapshot["walls"][number], room: RoomSnapshot): boolean {
  const door = room.geometry.closedDoorRect;
  return wall.x === door.x && wall.y === door.y && wall.width === door.width && wall.height === door.height;
}

function drawWalls(context: DrawingContext, room: RoomSnapshot, time: number, doorProgress: number): void {
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

function drawPlayer(context: DrawingContext, room: RoomSnapshot): void {
  const { x, y } = room.player;
  context.pushTransform();
  context.translate(x, y);
  context.scale(1.18, 1.18);
  const stride = walking ? Math.sin(game.elapsed * 14) * 3 : 0;
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

function drawCaptain(context: DrawingContext, room: RoomSnapshot): void {
  const captain = room.captain;
  if (captain.state !== "chasing") return;
  const bounce = reducedMotion.matches ? 0 : Math.sin(captain.bouncePhase) * 2;
  context.pushTransform();
  context.translate(captain.x, captain.y + bounce);
  context.scale(captain.radius / 14, captain.radius / 14);
  // An armored mask with angular side panels and inward-sloping brows.
  line(context, [[-8,-12],[8,-12],[11,-9],[13,-9],[13,1],
    [9,5],[7,10],[3,13],[-3,13],[-7,10],[-9,5],[-13,1],[-13,-9],[-11,-9]], captainSteel, 1.2);
  context.setColor(captainEyes); context.setIntensity(1.5);
  context.moveTo(-9,-5); context.lineTo(-3,-2);
  context.moveTo(9,-5); context.lineTo(3,-2);
  // Keep the eye cores below overdrive so the renderer preserves their red colour.
  context.setColor([1, 0.05, 0.02]); context.setIntensity(1);
  context.point(-6,0); context.point(6,0);
  context.setColor(captainSteel); context.setIntensity(1.2);
  context.moveTo(-4,-10); context.lineTo(4,-10);
  context.moveTo(-10,1); context.lineTo(-8,4); context.lineTo(-6,4);
  context.moveTo(10,1); context.lineTo(8,4); context.lineTo(6,4);
  line(context, [[-6,6],[6,6],[5,10],[-5,10]], captainSteel, 1.2);
  context.moveTo(-2,6); context.lineTo(-2,10);
  context.moveTo(2,6); context.lineTo(2,10);
  context.popTransform();
}

function drawRoomCaptain(room: RoomSnapshot, offsetX: number, offsetY: number): void {
  const roomBounds = {
    left: offsetX - ROOM.width / 2,
    right: offsetX + ROOM.width / 2,
    bottom: roomCenterY + offsetY - ROOM.height / 2,
    top: roomCenterY + offsetY + ROOM.height / 2,
  };
  const bounds = intersectClipBounds(sceneClip, roomBounds);
  if (!bounds) return;
  const captainScene = clippedDrawing(drawing, bounds);
  captainScene.pushTransform();
  captainScene.translate(offsetX, roomCenterY + offsetY);
  captainScene.scale(1, -1);
  captainScene.translate(-ROOM.width / 2, -ROOM.height / 2);
  drawCaptain(captainScene, room);
  captainScene.popTransform();
}

function drawRoom(room: RoomSnapshot, time: number, offsetX = 0, offsetY = 0, doorProgress = 1, showPlayer = true): void {
  const scene = clippedDrawing(drawing, sceneClip);
  scene.pushTransform();
  scene.translate(offsetX, roomCenterY + offsetY);
  scene.scale(1, -1);
  scene.translate(-ROOM.width / 2, -ROOM.height / 2);
  drawWalls(scene, room, time, doorProgress);
  for (const robot of room.robots) {
    const { x, y, radius: r } = robot;
    line(scene, [[x-r,y-r*.8],[x+r,y-r*.8],[x+r,y+r*.6],[x+r*.5,y+r*.6],
      [x+r*.5,y+r],[x-r*.5,y+r],[x-r*.5,y+r*.6],[x-r,y+r*.6]], robotColors[room.difficulty.color]);
    scene.setColor(amber); scene.setIntensity(1);
    scene.point(x-r*.45,y-r*.25); scene.point(x+r*.45,y-r*.25);
  }
  if (showPlayer && game.outcome === "playing") drawPlayer(scene, room);
  for (const shot of room.shots) {
    const length = Math.hypot(shot.velocityX, shot.velocityY) || 1;
    scene.setColor(shot.owner === "player" ? cyan : amber); scene.setIntensity(1.4);
    scene.moveTo(shot.x, shot.y);
    scene.lineTo(shot.x - shot.velocityX / length * 10, shot.y - shot.velocityY / length * 10);
  }
  scene.popTransform();
  drawRoomCaptain(room, offsetX, offsetY);
}

function draw(time: number): void {
  drawing.beginFrame();
  drawing.setColor(white); drawing.setIntensity(0.7);
  drawText(drawing, "VERY ANGRY ROBOTS", -440, 350, { ...textOptions, height: 16 });
  const hudOptions = { ...textOptions, height: 16 };
  const score = `SCORE ${game.score}`;
  drawText(drawing, score, -190, 350, hudOptions);
  const lives = `LIVES ${game.lives}`;
  drawText(drawing, lives, 70, 350, hudOptions);
  const robotCount = `ROBOTS ${game.robots.length}`;
  drawText(drawing, robotCount, 440 - measureText(robotCount, hudOptions).width, 350, hudOptions);

  const transition = game.transition;
  if (transition) {
    const elapsed = transition.progress * transition.duration;
    const scrollProgress = reducedMotion.matches ? 1 : Math.min(1, elapsed / ROOM_SCROLL_DURATION);
    const doorProgress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (elapsed - ROOM_SCROLL_DURATION) / DOOR_CLOSE_DURATION));
    const offsets = transitionOffsets(transition.direction, scrollProgress);
    drawRoom(transition.from, time, offsets.from.x, offsets.from.y, 1, false);
    drawRoom(transition.to, time, offsets.to.x, offsets.to.y, doorProgress);
  } else {
    drawRoom(game, time);
  }

  if (!started) label("PRESS ENTER OR START", roomCenterY, amber);
  else if (game.outcome === "dying") {
    label("PLAYER DOWN", roomCenterY + 12, red);
    if (game.lives > 0) {
      const seconds = Math.max(0, game.deathTimeRemaining).toFixed(1);
      label(`RESPAWNING IN ${seconds}`, roomCenterY - 14, amber);
    }
  } else if (game.outcome === "lost") label("GAME OVER - PRESS ENTER OR START", roomCenterY, red);
  drawing.endFrame();
}

window.addEventListener("keydown", (event) => { if (input.keyDown(event.key, event.repeat)) event.preventDefault(); });
window.addEventListener("keyup", (event) => input.keyUp(event.key));
window.addEventListener("blur", () => input.clearKeyboard());
document.addEventListener("visibilitychange", () => { if (document.hidden) input.clearKeyboard(); });
function resize(): void {
  const rect = screen.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  screen.width = Math.max(1, Math.round(rect.width * ratio));
  screen.height = Math.max(1, Math.round(rect.height * ratio));
}
window.addEventListener("resize", resize);
resize();
let lastTime = 0;
function frame(time: number): void {
  const delta = lastTime ? Math.min((time-lastTime)/1000, 0.05) : 0;
  lastTime = time;
  const pad = Array.from(navigator.getGamepads?.() ?? []).find((p) => p?.connected && p.mapping === "standard");
  const controls = input.read(pad ? { leftX: pad.axes[0] ?? 0, leftY: pad.axes[1] ?? 0, rightX: pad.axes[2] ?? 0, rightY: pad.axes[3] ?? 0, startPressed: pad.buttons[9]?.pressed ?? false } : undefined);
  if (!game.transition && (controls.aim.x || controls.aim.y)) aim = controls.aim;
  if (!started && controls.startPressed) started = true;
  else if (started) {
    const previousX = game.player.x, previousY = game.player.y;
    const simulationDelta = reducedMotion.matches && game.transition ? game.transition.duration : delta;
    updateGame(game, simulationDelta, { moveX: controls.move.x, moveY: controls.move.y, aimX: controls.aim.x, aimY: controls.aim.y,
      fire: !!(controls.aim.x || controls.aim.y), restartPressed: controls.startPressed && game.outcome !== "playing" });
    walking = !game.transition && game.outcome === "playing" && (game.player.x !== previousX || game.player.y !== previousY);
  }
  draw(time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
