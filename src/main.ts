import {
  createCanvasRenderer,
  createWebGL2Renderer,
  drawCircle,
  drawEllipse,
  drawPolygonOutline,
  drawPolyline,
  type Color,
  type DisplayOrientation,
  type DrawingContext,
} from "./index.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#screen");
if (!canvas) throw new Error("Missing #screen canvas");
const screen: HTMLCanvasElement = canvas;

const params = new URLSearchParams(location.search);
const orientation: DisplayOrientation = params.get("orientation") === "portrait"
  ? "portrait"
  : "landscape";
const aspectRatio = orientation === "landscape" ? 4 / 3 : 3 / 4;
const renderOptions = { orientation };

function resizeCanvas(): void {
  const maxWidth = Math.min(window.innerWidth * 0.96, window.innerHeight * 0.92 * aspectRatio);
  const cssWidth = Math.max(1, Math.min(800, maxWidth));
  const cssHeight = cssWidth / aspectRatio;
  const pixelRatio = window.devicePixelRatio || 1;

  screen.style.width = `${cssWidth}px`;
  screen.style.height = `${cssHeight}px`;
  screen.width = Math.round(cssWidth * pixelRatio);
  screen.height = Math.round(cssHeight * pixelRatio);
}

resizeCanvas();

const renderer: DrawingContext = params.get("renderer") === "canvas"
  ? createCanvasRenderer(
    requireContext(screen.getContext("2d"), "Canvas 2D"),
    renderOptions,
  )
  : createWebGL2Renderer(
    requireContext(screen.getContext("webgl2", { alpha: true }), "WebGL2"),
    renderOptions,
  );

const cyan: Color = [0, 0.9, 1];
const amber: Color = [1, 0.55, 0.12];
const magenta: Color = [1, 0, 1];
const green: Color = [0, 1, 0];

function project(x: number, y: number): readonly [number, number] {
  return orientation === "portrait" ? [y, -x] : [x, y];
}

function move(x: number, y: number): void {
  renderer.moveTo(...project(x, y));
}

function line(x: number, y: number): void {
  renderer.lineTo(...project(x, y));
}

function point(x: number, y: number): void {
  renderer.point(...project(x, y));
}

function drawDiagnostic(): void {
  renderer.beginFrame();

  // A dim frame gives the samples a shared boundary without competing with them.
  renderer.setColor(cyan);
  renderer.setIntensity(0.25);
  drawPolygonOutline(renderer, [
    [-470, -330], [470, -330], [470, 330], [-470, 330],
  ].map(([x, y]) => project(x, y)));

  // Open connected paths, stepping down in intensity.
  renderer.setColor(magenta);
  for (const [intensity, y] of [[1, 220], [0.75, 145], [0.5, 70], [0.25, -5]]) {
    renderer.setIntensity(intensity);
    drawPolyline(renderer, [
      [-430, y - 28], [-385, y + 28], [-340, y - 28], [-295, y + 28],
    ].map(([x, py]) => project(x, py)));
  }

  // Closed outlines use the same geometry at matching intensity steps.
  renderer.setColor(green);
  for (const [intensity, y] of [[1, 220], [0.75, 145], [0.5, 70], [0.25, -5]]) {
    renderer.setIntensity(intensity);
    drawPolygonOutline(renderer, [
      [295, y + 28], [430, y + 28], [412, y - 28], [313, y - 28],
    ].map(([x, py]) => project(x, py)));
  }

  // A central beam study: line crossing a closed vector shape and a point.
  renderer.setColor(amber);
  renderer.setIntensity(0.75);
  drawPolygonOutline(renderer, [
    [-78, -72], [0, 108], [78, -72],
  ].map(([x, y]) => project(x, y)));
  renderer.setColor(cyan);
  renderer.setIntensity(1);
  move(-178, 15);
  line(178, 15);
  point(0, 15);

  // Short line and point samples show three distinct intensity levels.
  renderer.setColor(cyan);
  for (const [intensity, y] of [[0.25, -170], [0.6, -225], [1, -280]]) {
    renderer.setIntensity(intensity);
    move(-430, y);
    line(-270, y);
    point(-238, y);
  }

  renderer.setIntensity(0.75);
  renderer.setColor(amber);
  drawCircle(renderer, project(-75, -215), 43);
  renderer.setColor(green);
  const ellipseRadii: readonly [number, number] = orientation === "portrait" ? [40, 72] : [72, 40];
  drawEllipse(renderer, project(75, -215), ...ellipseRadii);

  // Nested rectangles make the high-intensity halo response easy to compare.
  renderer.setColor(cyan);
  for (const [intensity, inset] of [[1, 0], [0.75, 16], [0.5, 32], [0.25, 48]]) {
    renderer.setIntensity(intensity);
    drawPolygonOutline(renderer, [
      [210 + inset, -115 - inset],
      [450 - inset, -115 - inset],
      [450 - inset, -310 + inset],
      [210 + inset, -310 + inset],
    ].map(([x, y]) => project(x, y)));
  }

  renderer.endFrame();
}

window.addEventListener("resize", () => {
  resizeCanvas();
  drawDiagnostic();
});

drawDiagnostic();

function requireContext<T>(context: T | null, name: string): T {
  if (!context) throw new Error(`${name} is unavailable`);
  return context;
}
