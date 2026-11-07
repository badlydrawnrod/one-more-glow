import {
  createCanvasRenderer,
  createWebGL2Renderer,
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
  move(-358, 243);
  line(358, 243);
  line(358, -243);
  line(-358, -243);
  line(-358, 243);

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
