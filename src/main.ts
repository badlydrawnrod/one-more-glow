import {
  createCanvasRenderer,
  createWebGL2Renderer,
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
  renderer.setColor(cyan);
  renderer.setIntensity(1);
  move(-358, 243);
  line(358, 243);
  line(358, -243);
  line(-358, -243);
  line(-358, 243);

  for (const [intensity, inset] of [[0.75, 18], [0.5, 36], [0.25, 54]]) {
    renderer.setIntensity(intensity);
    drawPolygonOutline(renderer, [
      [-358 + inset, 243 - inset],
      [358 - inset, 243 - inset],
      [358 - inset, -243 + inset],
      [-358 + inset, -243 + inset],
    ].map(([x, y]) => project(x, y)));
  }

  renderer.setColor(amber);
  renderer.setIntensity(0.75);
  move(0, 141);
  line(90, -64);
  line(-90, -64);
  line(0, 141);
  point(0, 0);

  renderer.setIntensity(1);
  renderer.setColor(cyan);
  move(-179, 0);
  line(179, 0);

  renderer.setColor(magenta);
  drawPolyline(renderer, [
    [-320, 125],
    [-270, 185],
    [-220, 125],
    [-170, 185],
  ].map(([x, y]) => project(x, y)));

  renderer.setColor(green);
  drawPolygonOutline(renderer, [
    [170, 150],
    [310, 150],
    [290, 35],
    [190, 35],
  ].map(([x, y]) => project(x, y)));

  for (const [intensity, offsetY] of [[0.75, -100], [0.5, -200], [0.25, -300]]) {
    renderer.setIntensity(intensity);

    renderer.setColor(magenta);
    drawPolyline(renderer, [
      [-320, 125 + offsetY],
      [-270, 185 + offsetY],
      [-220, 125 + offsetY],
      [-170, 185 + offsetY],
    ].map(([x, y]) => project(x, y)));

    renderer.setColor(green);
    drawPolygonOutline(renderer, [
      [170, 150 + offsetY],
      [310, 150 + offsetY],
      [290, 35 + offsetY],
      [190, 35 + offsetY],
    ].map(([x, y]) => project(x, y)));
  }

  renderer.setIntensity(0.25);
  move(-384, -154);
  line(-128, -154);
  point(-64, -154);

  renderer.setIntensity(0.6);
  move(-384, -205);
  line(-128, -205);
  point(-64, -205);

  renderer.setIntensity(1);
  move(-384, -256);
  line(-128, -256);
  point(-64, -256);
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
