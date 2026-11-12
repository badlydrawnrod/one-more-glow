import { createWebGL2Renderer, drawCircle, drawPolygonOutline, drawText, measureText, type Color, type Point } from "one-more-glow";
import { createGame, updateGame, ROOM } from "./game.ts";
import { WALL_THICKNESS } from "./maze.ts";
import { wallOutline } from "./wall-outline.ts";
import { InputController } from "./input.ts";
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
const blue: Color = [0.28, 0.63, 1];
const white: Color = [0.8, 0.96, 1];
const roomCenterY = -60;
const doorOpening = 120;
const textOptions = { font: "segment22", height: 19, spacing: "kerned" } as const;
function label(text: string, y: number, color: Color = white): void {
  drawing.setColor(color); drawing.setIntensity(1);
  drawText(drawing, text, -measureText(text, textOptions).width / 2, y, textOptions);
}
function line(points: readonly Point[], color: Color, intensity = 1): void {
  drawing.setColor(color); drawing.setIntensity(intensity); drawPolygonOutline(drawing, points);
}
let outlinedWalls: typeof game.walls | undefined;
let wallEdges: [number, number, number, number][] = [];
function drawWalls(time: number): void {
  if (outlinedWalls !== game.walls) {
    outlinedWalls = game.walls;
    const edge = WALL_THICKNESS;
    // Doorways are centered in the middle cell of each outer wall.
    const horizontalEnd = (ROOM.width - doorOpening) / 2;
    const verticalEnd = (ROOM.height - doorOpening) / 2;
    const jambLength = 12;
    wallEdges = wallOutline([
      ...game.walls,
      ...[0, ROOM.height].flatMap((y) => [
        { x: -edge / 2, y: y - edge / 2, width: horizontalEnd + edge, height: edge },
        { x: ROOM.width - horizontalEnd - edge / 2, y: y - edge / 2, width: horizontalEnd + edge, height: edge },
      ]),
      ...[0, ROOM.width].flatMap((x) => [
        { x: x - edge / 2, y: 0, width: edge, height: verticalEnd + edge / 2 },
        { x: x - edge / 2, y: ROOM.height - verticalEnd - edge / 2, width: edge, height: verticalEnd + edge / 2 },
      ]),
      ...[0, ROOM.height - jambLength].flatMap((y) => [
        { x: horizontalEnd - edge / 2, y, width: edge, height: jambLength },
        { x: ROOM.width - horizontalEnd - edge / 2, y, width: edge, height: jambLength },
      ]),
      ...[0, ROOM.width - jambLength].flatMap((x) => [
        { x, y: verticalEnd - edge / 2, width: jambLength, height: edge },
        { x, y: ROOM.height - verticalEnd - edge / 2, width: jambLength, height: edge },
      ]),
    ]);
  }
  const pulse = reducedMotion.matches ? 1.05 : 1.05 + 0.28 * Math.sin(time * 0.003);
  drawing.setColor(blue); drawing.setIntensity(pulse);
  for (const [x1, y1, x2, y2] of wallEdges) {
    drawing.moveTo(x1, y1); drawing.lineTo(x2, y2);
  }
  // The entrance is closed; the other three doorways are shown open.
  const halfDoor = doorOpening / 2;
  const halfWall = WALL_THICKNESS / 2;
  line([[-halfWall, ROOM.height / 2 - halfDoor + halfWall],
    [halfWall, ROOM.height / 2 - halfDoor + halfWall],
    [halfWall, ROOM.height / 2 + halfDoor - halfWall],
    [-halfWall, ROOM.height / 2 + halfDoor - halfWall]], amber);
  drawing.moveTo(-halfWall, ROOM.height / 2);
  drawing.lineTo(halfWall, ROOM.height / 2);
}
function draw(time: number): void {
  drawing.beginFrame();
  drawing.setColor(white); drawing.setIntensity(0.7);
  drawText(drawing, "VERY ANGRY ROBOTS", -440, 350, { ...textOptions, height: 16 });
  drawText(drawing, `ROBOTS ${game.robots.length}`, 285, 350, { ...textOptions, height: 16 });
  drawing.pushTransform();
  drawing.translate(0, roomCenterY);
  drawing.scale(1, -1);
  drawing.translate(-ROOM.width / 2, -ROOM.height / 2);
  drawWalls(time);
  for (const robot of game.robots) {
    const { x, y, radius: r } = robot;
    line([[x-r,y-r*.8],[x+r,y-r*.8],[x+r,y+r*.6],[x+r*.5,y+r*.6],[x+r*.5,y+r],[x-r*.5,y+r],[x-r*.5,y+r*.6],[x-r,y+r*.6]], red);
    drawing.setColor(amber); drawing.setIntensity(1); drawing.point(x-r*.45,y-r*.25); drawing.point(x+r*.45,y-r*.25);
  }
  if (game.outcome !== "lost") {
    drawing.pushTransform();
    drawing.translate(game.player.x, game.player.y);
    drawing.scale(1.18, 1.18);
    const x = 0, y = 0;
    const stride = walking ? Math.sin(game.elapsed * 14) * 3 : 0;
    drawing.setColor(cyan); drawing.setIntensity(1);
    drawCircle(drawing, [x, y - 8], 6);
    drawing.setColor(white); drawing.setIntensity(0.85);
    drawing.point(x - 2, y - 8); drawing.point(x + 2, y - 8);
    line([[x-5,y-1],[x+5,y-1],[x+6,y+8],[x-6,y+8]], cyan);
    drawing.setColor(cyan); drawing.setIntensity(0.9);
    drawing.moveTo(x-3, y+8); drawing.lineTo(x-4-stride, y+14);
    drawing.moveTo(x+3, y+8); drawing.lineTo(x+4+stride, y+14);
    const gunSide = aim.x < 0 ? -1 : 1;
    const shoulderX = x + gunSide * 6;
    const shoulderY = y - 1;
    const handX = shoulderX + aim.x * 6;
    const handY = shoulderY + aim.y * 6;
    drawing.moveTo(x - gunSide * 5, y+1);
    drawing.lineTo(x - gunSide * 9, y+5);
    drawing.moveTo(shoulderX, shoulderY);
    drawing.lineTo(handX, handY);
    drawing.setColor(amber); drawing.setIntensity(1.1);
    drawing.moveTo(handX, handY);
    drawing.lineTo(handX + aim.x * 6, handY + aim.y * 6);
    drawing.popTransform();
  }
  for (const shot of game.shots) {
    const length = Math.hypot(shot.velocityX, shot.velocityY) || 1;
    drawing.setColor(shot.owner === "player" ? cyan : amber); drawing.setIntensity(1.4);
    drawing.moveTo(shot.x, shot.y); drawing.lineTo(shot.x - shot.velocityX / length * 10, shot.y - shot.velocityY / length * 10);
  }
  drawing.popTransform();
  if (!started) { label("PRESS ENTER OR START", roomCenterY, amber); }
  else if (game.outcome === "won") { label("ROOM CLEAR - PRESS ENTER OR START", roomCenterY, cyan); }
  else if (game.outcome === "lost") { label("YOU DIED - PRESS ENTER OR START", roomCenterY, red); }
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
  if (controls.aim.x || controls.aim.y) aim = controls.aim;
  if (!started && controls.startPressed) started = true;
  else if (started) {
    const previousX = game.player.x, previousY = game.player.y;
    updateGame(game, delta, { moveX: controls.move.x, moveY: controls.move.y, aimX: controls.aim.x, aimY: controls.aim.y, fire: !!(controls.aim.x || controls.aim.y), restartPressed: controls.startPressed && game.outcome !== "playing" });
    walking = game.outcome === "playing" && (game.player.x !== previousX || game.player.y !== previousY);
  }
  draw(time);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
