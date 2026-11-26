import {
  createWebGL2Renderer,
  drawPolygonOutline,
  drawText,
  type Color,
  type DrawingContext,
} from "one-more-glow";
import { GyrussInput, type GameplayInput } from "./input.ts";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#screen");
if (!canvas) throw new Error("Missing #screen canvas");
const screen: HTMLCanvasElement = canvas;
const gameOverOverlay = requireElement("#game-over");
const restartButton = document.querySelector<HTMLButtonElement>("#restart");
if (!restartButton) throw new Error("Missing #restart button");

const gl = screen.getContext("webgl2", { alpha: true });
if (!gl) throw new Error("WebGL2 is unavailable in this browser");

const drawing: DrawingContext = createWebGL2Renderer(gl);
const cyan: Color = [0.3, 0.91, 1];
const paleBlue: Color = [0.62, 0.83, 1];
const pink: Color = [1, 0.34, 0.76];
const amber: Color = [1, 0.68, 0.3];
const tunnelBlue: Color = [0.08, 0.35, 1];
const dimTunnelBlue: Color = [0.08, 0.24, 0.8];
const outerRailBlue: Color = [0.12, 0.42, 1];
const world = { halfWidth: 512, halfHeight: 384 };
const orbitRadius = 330;
const tau = Math.PI * 2;
const input = new GyrussInput();
type Point = readonly [number, number];

interface Bullet {
  angle: number;
  radius: number;
}

interface Enemy {
  angle: number;
  radius: number;
  angularSpeed: number;
  size: number;
  spin: number;
}

interface Particle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  age: number;
  lifetime: number;
  color: Color;
  streak: number;
}

const player = { angle: 3 * Math.PI / 2 };
const bullets: Bullet[] = [];
const enemies: Enemy[] = [];
const particles: Particle[] = [];
const game = {
  score: 0,
  lives: 3,
  gameOver: false,
  respawnTimer: 0,
  fireCooldown: 0,
  spawnTimer: 0.55,
  waveNumber: 1,
  waveShipsRemaining: 8,
  waveAngle: 0,
  waveDirection: 1,
};
const stars = Array.from({ length: 80 }, (_, index) => {
  const seed = index * 97.31 + 11.7;
  return {
    x: fract(Math.sin(seed) * 43758.5453) * world.halfWidth * 2 - world.halfWidth,
    y: fract(Math.sin(seed + 19.2) * 24634.6345) * world.halfHeight * 2 - world.halfHeight,
    intensity: 0.15 + fract(Math.sin(seed + 3.8) * 17431.73) * 0.3,
  };
});

const shipOutline: readonly Point[] = [[0, 21], [-11, -10], [0, -5], [11, -10]];
const shipDetail: readonly Point[] = [[-6, -6], [0, 1], [6, -6]];
const enemyShape: readonly Point[] = [[0, 13], [-11, 2], [-7, -10], [0, -6], [7, -10], [11, 2]];

function fract(value: number): number {
  return value - Math.floor(value);
}

function requireElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}

function resizeCanvas(): void {
  const rect = screen.getBoundingClientRect();
  // Keep the glow-heavy scene responsive on high-density displays.
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  screen.width = Math.max(1, Math.round(rect.width * pixelRatio));
  screen.height = Math.max(1, Math.round(rect.height * pixelRatio));
}

function polar(angle: number, radius: number): Point {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function wrapAngle(angle: number): number {
  return ((angle % tau) + tau) % tau;
}

function depthScale(radius: number): number {
  const depth = orbitRadius - clamp(radius, 0, orbitRadius);
  const nearPlane = orbitRadius / 3;
  return nearPlane / (nearPlane + depth);
}

function circlePoints(radius: number): readonly Point[] {
  const segments = Math.max(12, Math.ceil(Math.PI / Math.acos(1 - 0.5 / radius)));
  return Array.from({ length: segments }, (_, index) => polar(index * tau / segments, radius));
}

const spokeCount = 16;
const tunnelSpokes = Array.from({ length: spokeCount }, (_, index) => {
  const angle = index * tau / spokeCount;
  return {
    inner: polar(angle, orbitRadius * 0.16),
    outer: polar(angle, orbitRadius - 8),
  };
});
const ringCount = 5;
const tunnelRings = Array.from({ length: ringCount }, (_, index) => {
  const depth = (index + 1) / ringCount;
  const firstRingRadius = 48;
  const lastRingRadius = orbitRadius * 0.9;
  const radius = firstRingRadius + (lastRingRadius - firstRingRadius) * depth * depth;
  return { points: circlePoints(radius), intensity: 0.25 + depth * 0.1 };
});
const innerOrbitRing = circlePoints(orbitRadius - 10);
const outerOrbitRing = circlePoints(orbitRadius);
const coreRing = circlePoints(34);
const coreOuterShape: readonly Point[] = [[0, 24], [17, 0], [0, -24], [-17, 0]];
const coreInnerShape: readonly Point[] = [[0, 11], [8, 0], [0, -11], [-8, 0]];

function drawTunnel(time: number): void {
  drawing.setColor(paleBlue);
  for (const star of stars) {
    drawing.setIntensity(star.intensity);
    drawing.point(star.x, star.y);
  }

  drawing.setColor(dimTunnelBlue);
  drawing.setIntensity(0.4);
  for (const spoke of tunnelSpokes) {
    drawing.moveTo(...spoke.inner);
    drawing.lineTo(...spoke.outer);
  }

  drawing.setColor(tunnelBlue);
  for (const ring of tunnelRings) {
    drawing.setIntensity(ring.intensity);
    drawPolygonOutline(drawing, ring.points);
  }
  drawing.setColor(tunnelBlue);
  drawing.setIntensity(0.38);
  drawPolygonOutline(drawing, innerOrbitRing);
  drawing.setColor(outerRailBlue);
  drawing.setIntensity(0.5);
  drawPolygonOutline(drawing, outerOrbitRing);
  drawing.setColor(amber);
  drawing.setIntensity(0.34 + Math.sin(time * 0.002) * 0.1);
  drawPolygonOutline(drawing, coreRing);
  drawing.setColor(pink);
  drawing.setIntensity(0.68);
  drawPolygonOutline(drawing, coreOuterShape);
  drawing.setColor(cyan);
  drawing.setIntensity(0.8);
  drawPolygonOutline(drawing, coreInnerShape);
}

function drawShip(): void {
  const [x, y] = polar(player.angle, orbitRadius);
  drawing.pushTransform();
  drawing.translate(x, y);
  drawing.rotate(player.angle * 180 / Math.PI + 90);
  drawing.setColor(cyan);
  drawing.setIntensity(1);
  drawPolygonOutline(drawing, shipOutline);
  drawing.setColor(paleBlue);
  drawing.setIntensity(0.72);
  drawing.moveTo(...shipDetail[0]);
  drawing.lineTo(...shipDetail[1]);
  drawing.lineTo(...shipDetail[2]);
  drawing.popTransform();
}

function drawBullet(bullet: Bullet): void {
  const scale = depthScale(bullet.radius);
  const halfLength = 8 * scale;
  const outer = polar(bullet.angle, bullet.radius + halfLength);
  const inner = polar(bullet.angle, bullet.radius - halfLength);
  drawing.setColor(amber);
  drawing.setIntensity(0.65 + scale * 0.35);
  drawing.moveTo(...outer);
  drawing.lineTo(...inner);
}

function drawEnemy(enemy: Enemy, time: number): void {
  const scale = depthScale(enemy.radius);
  const size = enemy.size * scale;
  const [x, y] = polar(enemy.angle, enemy.radius);
  drawing.pushTransform();
  drawing.translate(x, y);
  drawing.rotate(enemy.spin + time * 0.015);
  drawing.scale(size / 13, size / 13);
  drawing.setColor(pink);
  drawing.setIntensity(0.65 + scale * 0.35);
  drawPolygonOutline(drawing, enemyShape);
  drawing.popTransform();

  const trailStart = polar(enemy.angle, enemy.radius - size - 7 * scale);
  const trailEnd = polar(enemy.angle, enemy.radius - size - 18 * scale);
  drawing.setColor(amber);
  drawing.setIntensity(0.48);
  drawing.moveTo(...trailStart);
  drawing.lineTo(...trailEnd);
}

function drawParticles(): void {
  for (const particle of particles) {
    const remaining = 1 - particle.age / particle.lifetime;
    drawing.setColor(particle.color);
    drawing.setIntensity(remaining * remaining);
    if (particle.streak === 0) {
      drawing.point(particle.x, particle.y);
    } else {
      drawing.moveTo(particle.x, particle.y);
      drawing.lineTo(
        particle.x - particle.velocityX * particle.streak * remaining,
        particle.y - particle.velocityY * particle.streak * remaining,
      );
    }
  }
}

function drawHud(input: GameplayInput): void {
  const options = { font: "segment22", height: 14, spacing: "kerned" } as const;
  drawing.setColor(paleBlue);
  drawing.setIntensity(0.88);
  drawText(drawing, `SCORE ${game.score.toString().padStart(6, "0")}`, -480, 340, options);
  drawText(drawing, `WAVE ${game.waveNumber.toString().padStart(2, "0")}`, 370, 340, options);
  drawing.setColor(input.connected ? cyan : paleBlue);
  drawText(drawing, input.connected ? "CONTROLLER CONNECTED" : "KEYBOARD READY", -480, 315, options);
  drawing.setColor(amber);
  drawText(drawing, `SHIPS ${game.lives.toString().padStart(2, "0")}`, -480, -340, options);
  drawing.setColor(paleBlue);
  drawText(drawing, "EARTH: 1 SECTOR", 260, -340, options);
}

function drawFrame(time: number, input: GameplayInput): void {
  drawing.beginFrame();
  drawTunnel(time);
  for (const bullet of bullets) drawBullet(bullet);
  for (const enemy of enemies) drawEnemy(enemy, time);
  if (!game.gameOver && game.respawnTimer <= 0) drawShip();
  drawParticles();
  drawHud(input);
  drawing.endFrame();
}


function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function spawnEnemy(): void {
  enemies.push({
    angle: wrapAngle(game.waveAngle + (Math.random() - 0.5) * 0.08),
    radius: 28 + Math.random() * 6,
    angularSpeed: game.waveDirection * (1.6 + Math.random() * 0.18),
    size: 10 + Math.random() * 5,
    spin: Math.random() * 360,
  });
}

function explode(x: number, y: number, size: number, playerShip: boolean): void {
  const colors = playerShip ? [cyan, paleBlue, amber] : [pink, amber, paleBlue];
  const count = playerShip ? 48 : 24;
  for (let index = 0; index < count; index += 1) {
    const angle = (index + Math.random()) * tau / count;
    const speed = (45 + Math.random() * 145) * size;
    particles.push({
      x, y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      age: 0,
      lifetime: 0.35 + Math.random() * 0.65,
      color: colors[index % colors.length],
      streak: index % 3 === 0 ? 0 : 0.055 + Math.random() * 0.035,
    });
  }
}

function updateParticles(deltaSeconds: number): void {
  const drag = Math.exp(-1.8 * deltaSeconds);
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.age += deltaSeconds;
    if (particle.age >= particle.lifetime) {
      particles.splice(index, 1);
      continue;
    }
    particle.x += particle.velocityX * deltaSeconds;
    particle.y += particle.velocityY * deltaSeconds;
    particle.velocityX *= drag;
    particle.velocityY *= drag;
  }
}

function update(deltaSeconds: number, input: GameplayInput): void {
  updateParticles(deltaSeconds);
  game.respawnTimer = Math.max(0, game.respawnTimer - deltaSeconds);
  if (game.gameOver) return;

  player.angle = wrapAngle(player.angle + input.turn * 2.8 * deltaSeconds);
  game.fireCooldown = Math.max(0, game.fireCooldown - deltaSeconds);
  if (input.fire && game.fireCooldown === 0 && game.respawnTimer === 0) {
    bullets.push({ angle: player.angle, radius: orbitRadius - 28 });
    game.fireCooldown = 0.16;
  }

  for (let index = bullets.length - 1; index >= 0; index -= 1) {
    bullets[index].radius -= 520 * deltaSeconds;
    if (bullets[index].radius < 12) bullets.splice(index, 1);
  }

  game.spawnTimer -= deltaSeconds;
  if (game.spawnTimer <= 0) {
    if (game.waveShipsRemaining === 0) {
      game.waveNumber += 1;
      game.waveShipsRemaining = 8;
      game.waveAngle = wrapAngle((game.waveNumber - 1) * 2.4);
      game.waveDirection = game.waveNumber % 2 === 0 ? -1 : 1;
    }
    spawnEnemy();
    game.waveShipsRemaining -= 1;
    game.spawnTimer = game.waveShipsRemaining > 0 ? 0.28 : 2.5;
  }
  for (const enemy of enemies) {
    enemy.radius += 72 * deltaSeconds;
    enemy.angle = wrapAngle(enemy.angle + enemy.angularSpeed * deltaSeconds);
  }

  for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bulletPosition = polar(bullets[bulletIndex].angle, bullets[bulletIndex].radius);
    const enemyIndex = enemies.findIndex((enemy) => {
      const enemyPosition = polar(enemy.angle, enemy.radius);
      return Math.hypot(
        bulletPosition[0] - enemyPosition[0],
        bulletPosition[1] - enemyPosition[1],
      ) < enemy.size * depthScale(enemy.radius) + 8 * depthScale(bullets[bulletIndex].radius);
    });
    if (enemyIndex >= 0) {
      const enemy = enemies[enemyIndex];
      const [x, y] = polar(enemy.angle, enemy.radius);
      explode(x, y, depthScale(enemy.radius), false);
      enemies.splice(enemyIndex, 1);
      bullets.splice(bulletIndex, 1);
      game.score += 100;
    }
  }

  const playerPosition = polar(player.angle, orbitRadius);
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    if (game.respawnTimer === 0 && enemy.radius >= orbitRadius - 17) {
      const enemyPosition = polar(enemy.angle, enemy.radius);
      const distance = Math.hypot(
        playerPosition[0] - enemyPosition[0],
        playerPosition[1] - enemyPosition[1],
      );
      if (distance < enemy.size * depthScale(enemy.radius) + 11) {
        explode(enemyPosition[0], enemyPosition[1], depthScale(enemy.radius), false);
        explode(playerPosition[0], playerPosition[1], 1, true);
        enemies.splice(index, 1);
        game.lives -= 1;
        game.respawnTimer = 0.9;
        if (game.lives <= 0) {
          game.gameOver = true;
          break;
        }
        continue;
      }
    }
    if (enemy.radius > orbitRadius + 30) enemies.splice(index, 1);
  }
}

function updateHud(): void {
  const shouldHideOverlay = !game.gameOver || game.respawnTimer > 0;
  if (gameOverOverlay.hidden !== shouldHideOverlay) gameOverOverlay.hidden = shouldHideOverlay;
}

function restartGame(): void {
  player.angle = 3 * Math.PI / 2;
  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  game.score = 0;
  game.lives = 3;
  game.gameOver = false;
  game.respawnTimer = 0;
  game.fireCooldown = 0;
  game.spawnTimer = 0.55;
  game.waveNumber = 1;
  game.waveShipsRemaining = 8;
  game.waveAngle = 0;
  game.waveDirection = 1;
}

window.addEventListener("keydown", (event) => {
  if (input.keyDown(event)) event.preventDefault();
});
window.addEventListener("keyup", (event) => input.keyUp(event));
window.addEventListener("blur", () => input.blur());
window.addEventListener("gamepadconnected", (event) => input.forgetConnection(event.gamepad.index));
window.addEventListener("gamepaddisconnected", (event) => input.forgetConnection(event.gamepad.index));
window.addEventListener("resize", resizeCanvas);
restartButton.addEventListener("click", restartGame);
resizeCanvas();

let lastTime = 0;
function frame(time: number): void {
  const deltaSeconds = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  const controls = input.controls(input.read(navigator.getGamepads?.() ?? []), time, document.hasFocus() && !document.hidden);
  if (game.gameOver && controls.restartPressed) restartGame();
  update(deltaSeconds, controls);
  updateHud();
  drawFrame(time, controls);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
