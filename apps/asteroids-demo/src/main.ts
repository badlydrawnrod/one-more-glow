import {
  createWebGL2Renderer,
  drawPolygonOutline,
  drawText,
  type Color,
  type DrawingContext,
} from "one-more-glow";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#screen");
if (!canvas) throw new Error("Missing #screen canvas");
const screen: HTMLCanvasElement = canvas;
const gl = canvas.getContext("webgl2", { alpha: true });
if (!gl) throw new Error("WebGL2 is unavailable in this browser");

const drawing: DrawingContext = createWebGL2Renderer(gl);
const cyan: Color = [0.24, 0.91, 1];
const paleBlue: Color = [0.53, 0.89, 1];
const amber: Color = [1, 0.63, 0.29];
const dimBlue: Color = [0.12, 0.4, 0.49];
const world = { halfWidth: 512, halfHeight: 384 };
const pressedKeys = new Set<string>();
type Point = readonly [number, number];

const shipOutline: readonly Point[] = [[0, 25], [-16, -17], [0, -9], [16, -17]];
const shipDetail: readonly Point[] = [[-9, -12], [0, -4], [9, -12]];

interface Ship {
  x: number;
  y: number;
  heading: number;
  velocityX: number;
  velocityY: number;
}

interface Rock {
  x: number;
  y: number;
  radius: number;
  angle: number;
  spin: number;
  speedX: number;
  speedY: number;
  shape: readonly (readonly [number, number])[];
}

const ship: Ship = { x: 0, y: 0, heading: 0, velocityX: 0, velocityY: 0 };
const rocks: Rock[] = [
  makeRock(-300, 185, 54, 0.18, 19),
  makeRock(315, 218, 38, -0.12, 37),
  makeRock(350, -210, 68, 0.08, 61),
  makeRock(-270, -245, 32, -0.2, 83),
  makeRock(70, 305, 25, 0.15, 101),
];
const stars = Array.from({ length: 75 }, (_, index) => {
  const seed = index * 127.1 + 31.7;
  return {
    x: fract(Math.sin(seed) * 43758.5453) * world.halfWidth * 2 - world.halfWidth,
    y: fract(Math.sin(seed + 17.3) * 24634.6345) * world.halfHeight * 2 - world.halfHeight,
    intensity: 0.2 + fract(Math.sin(seed + 8.4) * 17431.73) * 0.35,
  };
});

function makeRock(
  x: number,
  y: number,
  radius: number,
  spin: number,
  seed: number,
): Rock {
  const shape = Array.from({ length: 9 }, (_, index) => {
    const angle = (index / 9) * Math.PI * 2;
    const variation = 0.76 + fract(Math.sin(seed + index * 9.17) * 4192.2) * 0.34;
    return [Math.cos(angle) * radius * variation, Math.sin(angle) * radius * variation] as const;
  });
  return {
    x, y, radius, angle: fract(seed * 0.618) * 360, spin,
    speedX: Math.sin(seed) * 5,
    speedY: Math.cos(seed * 1.3) * 4,
    shape,
  };
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function resizeCanvas(): void {
  const rect = screen.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  screen.width = Math.max(1, Math.round(rect.width * pixelRatio));
  screen.height = Math.max(1, Math.round(rect.height * pixelRatio));
}

function wrap(value: number, halfExtent: number): number {
  const span = halfExtent * 2;
  return ((value + halfExtent) % span + span) % span - halfExtent;
}

function drawWrappedCopies(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  drawAt: (x: number, y: number) => void,
): void {
  const xOffsets = [0];
  const yOffsets = [0];
  if (x - halfWidth < -world.halfWidth) xOffsets.push(world.halfWidth * 2);
  if (x + halfWidth > world.halfWidth) xOffsets.push(-world.halfWidth * 2);
  if (y - halfHeight < -world.halfHeight) yOffsets.push(world.halfHeight * 2);
  if (y + halfHeight > world.halfHeight) yOffsets.push(-world.halfHeight * 2);

  for (const offsetX of xOffsets) {
    for (const offsetY of yOffsets) {
      drawAt(x + offsetX, y + offsetY);
    }
  }
}

function rotatedHalfExtents(points: readonly Point[], angleDegrees: number): [number, number] {
  const angle = angleDegrees * Math.PI / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  let halfWidth = 0;
  let halfHeight = 0;
  for (const [x, y] of points) {
    halfWidth = Math.max(halfWidth, Math.abs(x * cosine - y * sine));
    halfHeight = Math.max(halfHeight, Math.abs(x * sine + y * cosine));
  }
  return [halfWidth + 1, halfHeight + 1];
}

function drawRock(rock: Rock): void {
  const [halfWidth, halfHeight] = rotatedHalfExtents(rock.shape, rock.angle);
  drawWrappedCopies(rock.x, rock.y, halfWidth, halfHeight, (x, y) => drawRockAt(rock, x, y));
}

function drawRockAt(rock: Rock, x: number, y: number): void {
  drawing.pushTransform();
  drawing.translate(x, y);
  drawing.rotate(rock.angle);
  drawing.setColor(dimBlue);
  drawing.setIntensity(0.8);
  drawPolygonOutline(drawing, rock.shape);
  drawing.popTransform();
}

function drawShip(thrusting: boolean, time: number): void {
  const flicker = 20 + Math.sin(time * 0.035) * 6;
  const points = [...shipOutline, ...shipDetail];
  if (thrusting) points.push([-6, -16], [0, -flicker], [6, -16]);
  const [halfWidth, halfHeight] = rotatedHalfExtents(points, -ship.heading * 180 / Math.PI);
  drawWrappedCopies(ship.x, ship.y, halfWidth, halfHeight, (x, y) =>
    drawShipAt(x, y, thrusting, flicker));
}

function drawShipAt(x: number, y: number, thrusting: boolean, flicker: number): void {
  drawing.pushTransform();
  drawing.translate(x, y);
  // Flight heading increases clockwise from the ship's forward (+Y) direction;
  // the drawing API's positive rotation is counter-clockwise.
  drawing.rotate(-ship.heading * 180 / Math.PI);

  drawing.setColor(cyan);
  drawing.setIntensity(1);
  drawPolygonOutline(drawing, shipOutline);
  drawing.setColor(paleBlue);
  drawing.setIntensity(0.62);
  drawing.moveTo(...shipDetail[0]);
  drawing.lineTo(...shipDetail[1]);
  drawing.lineTo(...shipDetail[2]);

  if (thrusting) {
    drawing.setColor(amber);
    drawing.setIntensity(0.85);
    drawing.moveTo(-6, -16);
    drawing.lineTo(0, -flicker);
    drawing.lineTo(6, -16);
  }
  drawing.popTransform();
}

function drawHud(thrusting: boolean, connected: boolean): void {
  const textOptions = { font: "segment16", height: 16, spacing: "kerned" } as const;
  drawing.setColor(dimBlue);
  drawing.setIntensity(0.9);
  drawText(drawing, "SECTOR 07", -480, 340, textOptions);
  drawText(drawing, `VELOCITY ${Math.round(Math.hypot(ship.velocityX, ship.velocityY)).toString().padStart(3, "0")}`, 235, 340, textOptions);
  drawing.setColor(connected ? paleBlue : dimBlue);
  drawText(drawing, connected ? "CONTROLLER CONNECTED" : "KEYBOARD READY", -480, -340, textOptions);
  drawing.setColor(amber);
  drawText(drawing, thrusting ? "THRUST ENGAGED" : "THRUST OFF", -480, -365, textOptions);
  drawing.setColor(dimBlue);
  drawText(drawing, "FREE FLIGHT", 365, -340, textOptions);
}

function drawArena(thrusting: boolean, connected: boolean, time: number): void {
  drawing.beginFrame();
  drawing.setColor(cyan);
  for (const star of stars) {
    drawing.setIntensity(star.intensity);
    drawing.point(star.x, star.y);
  }
  for (const rock of rocks) drawRock(rock);
  drawShip(thrusting, time);
  drawHud(thrusting, connected);
  drawing.endFrame();
}

function readInput(): { turn: number; thrust: boolean; connected: boolean } {
  const keyboardTurn = Number(pressedKeys.has("ArrowRight") || pressedKeys.has("d"))
    - Number(pressedKeys.has("ArrowLeft") || pressedKeys.has("a"));
  const keyboardThrust = pressedKeys.has("ArrowUp") || pressedKeys.has("w");
  const gamepad = Array.from(navigator.getGamepads?.() ?? []).find((pad) => pad?.connected) ?? null;
  if (!gamepad) {
    return { turn: keyboardTurn, thrust: keyboardThrust, connected: false };
  }

  const stickTurn = Math.abs(gamepad.axes[0] ?? 0) > 0.16 ? gamepad.axes[0] ?? 0 : 0;
  const dpadTurn = Number(gamepad.buttons[15]?.pressed ?? false)
    - Number(gamepad.buttons[14]?.pressed ?? false);
  const stickThrust = (gamepad.axes[1] ?? 0) < -0.35;
  const dpadThrust = gamepad.buttons[12]?.pressed ?? false;
  const buttonThrust = gamepad.buttons[0]?.pressed ?? false;
  return {
    turn: clamp(keyboardTurn + (stickTurn || dpadTurn), -1, 1),
    thrust: keyboardThrust || stickThrust || dpadThrust || buttonThrust,
    connected: true,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function update(deltaSeconds: number, input: ReturnType<typeof readInput>): void {
  ship.heading += input.turn * 3.4 * deltaSeconds;
  if (input.thrust) {
    ship.velocityX += Math.sin(ship.heading) * 175 * deltaSeconds;
    ship.velocityY += Math.cos(ship.heading) * 175 * deltaSeconds;
  }
  const drag = Math.pow(0.992, deltaSeconds * 60);
  ship.velocityX *= drag;
  ship.velocityY *= drag;

  const speed = Math.hypot(ship.velocityX, ship.velocityY);
  if (speed > 360) {
    ship.velocityX = ship.velocityX / speed * 360;
    ship.velocityY = ship.velocityY / speed * 360;
  }
  ship.x = wrap(ship.x + ship.velocityX * deltaSeconds, world.halfWidth);
  ship.y = wrap(ship.y + ship.velocityY * deltaSeconds, world.halfHeight);

  for (const rock of rocks) {
    rock.x = wrap(rock.x + rock.speedX * deltaSeconds, world.halfWidth);
    rock.y = wrap(rock.y + rock.speedY * deltaSeconds, world.halfHeight);
    rock.angle = (rock.angle + rock.spin * deltaSeconds) % 360;
  }
}

const handledKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "a", "d", "w"]);
window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (handledKeys.has(key)) {
    event.preventDefault();
    pressedKeys.add(key);
  }
});
window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  pressedKeys.delete(key);
});
window.addEventListener("blur", () => pressedKeys.clear());
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let lastTime = 0;
function frame(time: number): void {
  const deltaSeconds = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  const input = readInput();
  update(deltaSeconds, input);
  drawArena(input.thrust, input.connected, time);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
