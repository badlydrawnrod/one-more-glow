import {
  createWebGL2Renderer,
  DEFAULT_DISPLAY_PROFILE,
  drawArc,
  drawCircle,
  drawEllipse,
  drawEllipseArc,
  drawPolygonOutline,
  drawPolyline,
  drawText,
  type Color,
  type DisplayOrientation,
  type DisplayProfile,
  type DisplayRenderer,
} from "one-more-glow";
import { drawSegmentStudy, drawSpacingStudy } from "./segment-study.ts";
import { registerAppServiceWorker } from "./pwa.ts";
import { backingSize, fitCanvasSize, genericMap, type CanvasSize } from "./calibration-sizing.ts";

registerAppServiceWorker();

let screen = requireElement(document.querySelector<HTMLCanvasElement>("#screen"), "#screen");
const environmentScreen = requireElement(document.querySelector<HTMLElement>("#environment-screen"), "#environment-screen");
const rendererScreen = requireElement(document.querySelector<HTMLElement>("#renderer-screen"), "#renderer-screen");
const studyStageLabel = requireElement(document.querySelector<HTMLElement>("#study-stage-label"), "#study-stage-label");
const screenTabs = [...document.querySelectorAll<HTMLButtonElement>("[data-screen]")];
const animationControl = requireElement(document.querySelector<HTMLElement>("#animation-control"), "#animation-control");
const animationToggle = requireElement(document.querySelector<HTMLInputElement>("#animation-toggle"), "#animation-toggle");
const profileControls = requireElement(document.querySelector<HTMLElement>("#profile-controls"), "#profile-controls");
const profileReset = requireElement(document.querySelector<HTMLButtonElement>("#profile-reset"), "#profile-reset");
const calibrationViewport = requireElement(document.querySelector<HTMLElement>("#calibration-viewport"), "#calibration-viewport");
const genericCanvas = requireElement(document.querySelector<HTMLCanvasElement>("#calibration-generic"), "#calibration-generic");
let omgCanvas = requireElement(document.querySelector<HTMLCanvasElement>("#calibration-omg"), "#calibration-omg");
const resizeHandle = requireElement(document.querySelector<HTMLButtonElement>("#resize-handle"), "#resize-handle");
const widthInput = requireElement(document.querySelector<HTMLInputElement>("#manual-width"), "#manual-width");
const widthRange = requireElement(document.querySelector<HTMLInputElement>("#resize-handle-range"), "#resize-handle-range");
const autoFitInput = requireElement(document.querySelector<HTMLInputElement>("#auto-fit"), "#auto-fit");
const presetSelect = requireElement(document.querySelector<HTMLSelectElement>("#calibration-preset"), "#calibration-preset");
const backingScaleSelect = requireElement(document.querySelector<HTMLSelectElement>("#backing-scale"), "#backing-scale");
const ratioWidthInput = requireElement(document.querySelector<HTMLInputElement>("#ratio-width"), "#ratio-width");
const ratioHeightInput = requireElement(document.querySelector<HTMLInputElement>("#ratio-height"), "#ratio-height");
const virtualWidthInput = requireElement(document.querySelector<HTMLInputElement>("#virtual-width"), "#virtual-width");
const virtualHeightInput = requireElement(document.querySelector<HTMLInputElement>("#virtual-height"), "#virtual-height");
const customRatio = requireElement(document.querySelector<HTMLElement>("#custom-ratio"), "#custom-ratio");
const genericControls = requireElement(document.querySelector<HTMLElement>("#generic-controls"), "#generic-controls");
const orientationControl = requireElement(document.querySelector<HTMLElement>("#orientation-control"), "#orientation-control");
const calibrationError = requireElement(document.querySelector<HTMLElement>("#calibration-error"), "#calibration-error");
const calibrationModeLabel = requireElement(document.querySelector<HTMLElement>("#calibration-mode-label"), "#calibration-mode-label");
const canvasSizeValue = requireElement(document.querySelector<HTMLElement>("#canvas-size-value"), "#canvas-size-value");
const requestedSizeValue = requireElement(document.querySelector<HTMLElement>("#requested-size-value"), "#requested-size-value");
const backingSizeValue = requireElement(document.querySelector<HTMLElement>("#backing-size-value"), "#backing-size-value");
const mappingValue = requireElement(document.querySelector<HTMLElement>("#mapping-value"), "#mapping-value");
const scaleValue = requireElement(document.querySelector<HTMLElement>("#scale-value"), "#scale-value");
let profile: DisplayProfile = { ...DEFAULT_DISPLAY_PROFILE };

type CalibrationMode = "omg1" | "generic";
type MappingMode = "fit" | "stretch";
let calibrationMode: CalibrationMode = "omg1";
let mappingMode: MappingMode = "fit";
let calibrationOrientation: DisplayOrientation = "landscape";
let targetRatio = 4 / 3;
let ratioLabel = "4:3";
let virtualSize: CanvasSize = { width: 1024, height: 768 };
let manualWidth = 1024;
let lastCssSize: CanvasSize = { width: 1, height: 1 };
let calibrationRenderer: DisplayRenderer | null = null;
const omgSurfaces = new Map<DisplayOrientation, { canvas: HTMLCanvasElement; renderer: DisplayRenderer | null }>();
let resizePointer: { id: number; x: number; width: number } | null = null;

const params = new URLSearchParams(location.search);
let orientation: DisplayOrientation = params.get("orientation") === "portrait"
  ? "portrait"
  : "landscape";
const requestedScene = params.get("scene");
const validScenes = ["game", "testcard", "segments", "spacing", "profile"] as const;
type Scene = (typeof validScenes)[number];
const isScene = (value: string | null): value is Scene => validScenes.some((candidate) => candidate === value);
const hasExplicitScene = isScene(requestedScene);
const pagesDefault = import.meta.env.VITE_DEFAULT_SCENE === "testcard";
const legacyGameLink = !params.has("scene") && (params.get("orientation") === "portrait" || params.get("animate") === "1");
let scene: Scene = hasExplicitScene ? requestedScene : legacyGameLink ? "game" : pagesDefault ? "testcard" : "game";
let activeScreen: "environment" | "renderer" = hasExplicitScene || pagesDefault || legacyGameLink
  ? "renderer"
  : "environment";
let animate = params.get("animate") === "1" && scene === "game";
let renderer: DisplayRenderer;

function aspectRatio(): number {
  return orientation === "landscape" ? 4 / 3 : 3 / 4;
}

function resizeStudyCanvas(): void {
  const ratio = aspectRatio();
  const maxWidth = Math.min(window.innerWidth * 0.96, window.innerHeight * 0.92 * ratio);
  const cssWidth = Math.max(1, Math.min(800, maxWidth));
  const cssHeight = cssWidth / ratio;
  const pixelRatio = window.devicePixelRatio || 1;

  screen.style.width = `${cssWidth}px`;
  screen.style.height = `${cssHeight}px`;
  screen.width = Math.round(cssWidth * pixelRatio);
  screen.height = Math.round(cssHeight * pixelRatio);
}

function createRenderer(canvas: HTMLCanvasElement): DisplayRenderer {
  return createWebGL2Renderer(
    requireContext(canvas.getContext("webgl2", { alpha: true }), "WebGL2"),
    { orientation, profile },
  );
}

resizeStudyCanvas();
renderer = createRenderer(screen);

function ensureCalibrationRenderer(): DisplayRenderer | null {
  let surface = omgSurfaces.get(calibrationOrientation);
  if (!surface) {
    const canvas = calibrationOrientation === "landscape" ? omgCanvas : document.createElement("canvas");
    canvas.className = "calibration-canvas";
    canvas.id = calibrationOrientation === "landscape" ? "calibration-omg" : "calibration-omg-portrait";
    canvas.setAttribute("aria-label", `OMG-1 ${calibrationOrientation} calibration pattern`);
    let nextRenderer: DisplayRenderer | null = null;
    try {
      const context = canvas.getContext("webgl2", { alpha: true });
      if (context) nextRenderer = createWebGL2Renderer(context, { orientation: calibrationOrientation });
    } catch {
      nextRenderer = null;
    }
    surface = { canvas, renderer: nextRenderer };
    omgSurfaces.set(calibrationOrientation, surface);
  }
  if (omgCanvas !== surface.canvas) {
    omgCanvas.replaceWith(surface.canvas);
    omgCanvas = surface.canvas;
  }
  calibrationRenderer = surface.renderer;
  return calibrationRenderer;
}

function selectedBackingScale(): number {
  const dpr = Math.max(0.25, window.devicePixelRatio || 1);
  const value = backingScaleSelect.value;
  if (value === "robots") return Math.min(dpr, 2);
  if (value === "device") return dpr;
  return Number(value);
}

function availableCanvasSize(): CanvasSize {
  return { width: calibrationViewport.clientWidth, height: calibrationViewport.clientHeight };
}

function setCalibrationError(message = ""): void {
  calibrationError.textContent = message;
}

function boundedValue(input: HTMLInputElement, label: string, maximum: number): number | null {
  const value = Number(input.value);
  if (!input.value.trim() || !Number.isFinite(value) || value <= 0) {
    setCalibrationError(`${label} must be a finite positive number. The previous setting is still active.`);
    return null;
  }
  if (value > maximum) {
    setCalibrationError(`${label} is limited to ${maximum}. The previous setting is still active.`);
    return null;
  }
  return value;
}

function chooseManualPreset(): void {
  presetSelect.value = "manual";
}

function drawGenericCalibration(css: CanvasSize, backing: CanvasSize): void {
  const ctx = genericCanvas.getContext("2d");
  if (!ctx) return;
  const dprX = backing.width / css.width;
  const dprY = backing.height / css.height;
  if (genericCanvas.width !== backing.width) genericCanvas.width = backing.width;
  if (genericCanvas.height !== backing.height) genericCanvas.height = backing.height;
  ctx.setTransform(dprX, 0, 0, dprY, 0, 0);
  ctx.fillStyle = "#05080e";
  ctx.fillRect(0, 0, css.width, css.height);
  const mapped = genericMap(css, virtualSize, mappingMode);
  ctx.save();
  ctx.translate(mapped.offsetX, mapped.offsetY);
  ctx.scale(mapped.scaleX, mapped.scaleY);
  ctx.translate(virtualSize.width / 2, virtualSize.height / 2);
  const halfW = virtualSize.width / 2;
  const halfH = virtualSize.height / 2;
  ctx.strokeStyle = "rgba(63, 173, 190, .25)";
  ctx.lineWidth = Math.max(1, Math.min(virtualSize.width, virtualSize.height) / 900);
  for (let x = -halfW; x <= halfW; x += virtualSize.width / 8) {
    ctx.beginPath(); ctx.moveTo(x, -halfH); ctx.lineTo(x, halfH); ctx.stroke();
  }
  for (let y = -halfH; y <= halfH; y += virtualSize.height / 8) {
    ctx.beginPath(); ctx.moveTo(-halfW, y); ctx.lineTo(halfW, y); ctx.stroke();
  }
  ctx.strokeStyle = "#54dce9";
  ctx.lineWidth = Math.max(2, Math.min(virtualSize.width, virtualSize.height) / 220);
  ctx.beginPath(); ctx.moveTo(-halfW, 0); ctx.lineTo(halfW, 0); ctx.moveTo(0, -halfH); ctx.lineTo(0, halfH); ctx.stroke();
  const square = Math.min(virtualSize.width, virtualSize.height) * 0.42;
  ctx.strokeStyle = "#ffd18b";
  ctx.lineWidth = Math.max(3, Math.min(virtualSize.width, virtualSize.height) / 160);
  ctx.strokeRect(-square / 2, -square / 2, square, square);
  ctx.beginPath(); ctx.arc(0, 0, square * 0.34, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#e477ff";
  ctx.beginPath(); ctx.moveTo(-halfW * 0.82, -halfH * 0.82); ctx.lineTo(halfW * 0.82, halfH * 0.82); ctx.moveTo(halfW * 0.82, -halfH * 0.82); ctx.lineTo(-halfW * 0.82, halfH * 0.82); ctx.stroke();
  ctx.strokeStyle = "#baff81";
  ctx.lineWidth *= 1.5;
  ctx.strokeRect(-halfW * 0.9, -halfH * 0.9, halfW * 1.8, halfH * 1.8);
  for (const [x, y] of [[-halfW * 0.9, -halfH * 0.9], [halfW * 0.9, -halfH * 0.9], [-halfW * 0.9, halfH * 0.9], [halfW * 0.9, halfH * 0.9]]) {
    ctx.fillStyle = "#fff4ce"; ctx.fillRect(x - 5, y - 5, 10, 10);
  }
  ctx.restore();
}

function drawOmgCalibration(backing: CanvasSize): void {
  const target = ensureCalibrationRenderer();
  if (!target) return;
  if (omgCanvas.width !== backing.width) omgCanvas.width = backing.width;
  if (omgCanvas.height !== backing.height) omgCanvas.height = backing.height;
  const logical = calibrationOrientation === "landscape" ? { width: 1024, height: 768 } : { width: 768, height: 1024 };
  const x = logical.width / 2;
  const y = logical.height / 2;
  const edgeX = logical.width * 0.44;
  const edgeY = logical.height * 0.44;
  target.beginFrame();
  target.setColor([0.3, 0.75, 0.82]); target.setIntensity(0.25);
  for (let i = -4; i <= 4; i++) {
    target.moveTo(i * logical.width / 10, -edgeY); target.lineTo(i * logical.width / 10, edgeY);
    target.moveTo(-edgeX, i * logical.height / 10); target.lineTo(edgeX, i * logical.height / 10);
  }
  target.setColor([0, 0.9, 1]); target.setIntensity(0.95);
  target.moveTo(-edgeX, 0); target.lineTo(edgeX, 0); target.moveTo(0, -edgeY); target.lineTo(0, edgeY);
  target.setColor([1, 0.72, 0.3]); target.setIntensity(1);
  const square = Math.min(logical.width, logical.height) * 0.42;
  target.moveTo(x - square / 2, y - square / 2); target.lineTo(x + square / 2, y - square / 2);
  target.lineTo(x + square / 2, y + square / 2); target.lineTo(x - square / 2, y + square / 2); target.lineTo(x - square / 2, y - square / 2);
  drawCircle(target, [0, 0], square * 0.34);
  target.setColor([0.9, 0.4, 1]); target.setIntensity(0.9);
  target.moveTo(-edgeX * 0.88, -edgeY * 0.88); target.lineTo(edgeX * 0.88, edgeY * 0.88);
  target.moveTo(edgeX * 0.88, -edgeY * 0.88); target.lineTo(-edgeX * 0.88, edgeY * 0.88);
  target.setColor([0.7, 1, 0.45]);
  target.moveTo(-edgeX, -edgeY); target.lineTo(edgeX, -edgeY); target.lineTo(edgeX, edgeY); target.lineTo(-edgeX, edgeY); target.lineTo(-edgeX, -edgeY);
  for (const [px, py] of [[-edgeX, -edgeY], [edgeX, -edgeY], [-edgeX, edgeY], [edgeX, edgeY]]) target.point(px, py);
  target.endFrame();
}

function positionResizeHandle(css: CanvasSize): void {
  const area = availableCanvasSize();
  const x = Math.max(12, Math.min(area.width - 12, (area.width + css.width) / 2));
  const y = Math.max(12, Math.min(area.height - 12, (area.height + css.height) / 2));
  resizeHandle.style.left = `${x}px`;
  resizeHandle.style.top = `${y}px`;
}

function renderCalibration(): void {
  if (environmentScreen.hidden) return;
  const stage = availableCanvasSize();
  if (stage.width <= 1 || stage.height <= 1) return;
  const automatic = autoFitInput.checked;
  const cap = presetSelect.value === "robots" ? 1024 : 4096;
  const css = automatic ? fitCanvasSize(stage, targetRatio, cap) : { width: manualWidth, height: manualWidth / targetRatio };
  const scale = selectedBackingScale();
  for (const canvas of [genericCanvas, omgCanvas]) {
    canvas.style.width = `${css.width}px`;
    canvas.style.height = `${css.height}px`;
  }
  genericCanvas.hidden = calibrationMode !== "generic";
  omgCanvas.hidden = calibrationMode !== "omg1";
  const measuredRect = (calibrationMode === "generic" ? genericCanvas : omgCanvas).getBoundingClientRect();
  const measured: CanvasSize = { width: measuredRect.width, height: measuredRect.height };
  const backing = backingSize(measured, scale);
  if (backing.width > 8192 || backing.height > 8192 || backing.width * backing.height > 32_000_000) {
    setCalibrationError("The requested backing buffer exceeds the 32 megapixel allocation limit.");
    return;
  }
  setCalibrationError();
  lastCssSize = measured;
  if (calibrationMode === "generic") {
    drawGenericCalibration(measured, backing);
  } else {
    drawOmgCalibration(backing);
  }
  positionResizeHandle(measured);
  requestedSizeValue.textContent = `${css.width.toFixed(1)} × ${css.height.toFixed(1)} CSS px`;
  canvasSizeValue.textContent = `${measured.width.toFixed(1)} × ${measured.height.toFixed(1)} CSS px`;
  const activeCanvas = calibrationMode === "generic" ? genericCanvas : omgCanvas;
  backingSizeValue.textContent = `${activeCanvas.width} × ${activeCanvas.height} px`;
  mappingValue.textContent = calibrationMode === "omg1" ? `${logicalExtent()} logical · ${ratioLabel} canvas` : `${virtualSize.width} × ${virtualSize.height} · ${mappingMode}`;
  scaleValue.textContent = `${scale.toFixed(2)}×${backingScaleSelect.value === "robots" ? " · cap 2" : backingScaleSelect.value === "device" ? " · device" : " · manual"}`;
  widthInput.value = `${Math.round(css.width)}`;
  widthRange.value = `${Math.max(64, Math.min(4096, Math.round(css.width)))}`;
  calibrationModeLabel.textContent = `${calibrationMode === "omg1" ? "OMG-1" : "GENERIC"} / ${calibrationOrientation.toUpperCase()}`;
}

function logicalExtent(): string {
  return calibrationOrientation === "landscape" ? "1024 × 768" : "768 × 1024";
}

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

function drawTestCard(): void {
  renderer.beginFrame();
  renderer.pushTransform();
  renderer.translate(...project(0, 115));
  renderer.scale(0.65, 0.65);

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

  // A small local-coordinate craft row shows translation, rotation and scaling.
  renderer.setColor(amber);
  for (const [x, angle, size] of [[-150, -25, 0.8], [0, 0, 1], [150, 25, 1.2]]) {
    renderer.pushTransform();
    renderer.translate(...project(x, 205));
    renderer.rotate(angle);
    renderer.scale(size, size);
    drawPolygonOutline(renderer, [
      [0, 30], [-18, -20], [0, -10], [18, -20],
    ]);
    renderer.popTransform();
  }

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

  // Open arcs contrast with the closed circle and ellipse outlines.
  renderer.setColor(magenta);
  renderer.setIntensity(0.8);
  drawArc(renderer, project(-75, -215), 58, 25, 155);
  renderer.setColor(cyan);
  const arcRadii: readonly [number, number] = orientation === "portrait" ? [52, 86] : [86, 52];
  drawEllipseArc(renderer, project(75, -215), arcRadii[0], arcRadii[1], 205, 335);

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

  renderer.popTransform();

  // Keep geometry and colours constant to make the overdrive response visible.
  const intensities = [0.5, 1, 1.25, 1.5, 2];
  intensities.forEach((intensity, index) => {
    const x = -440 + index * 180;
    renderer.setColor([0.75, 0.8, 0.85]);
    renderer.setIntensity(0.8);
    const [labelX, labelY] = project(x, -150);
    drawText(renderer, intensity.toFixed(intensity === 1.25 ? 2 : 1), labelX, labelY, {
      font: "segment16", height: 20,
    });
    for (const [color, y] of [[cyan, -190], [magenta, -260]] as const) {
      renderer.setColor(color);
      renderer.setIntensity(intensity);
      move(x, y);
      line(x + 100, y);
      point(x + 130, y);
    }
  });

  renderer.endFrame();
}

function drawGameScene(shipAngle = -12): void {
  renderer.beginFrame();

  // A sparse, low-intensity arena grid sits behind the action.
  renderer.setColor(cyan);
  renderer.setIntensity(0.07);
  for (let x = -400; x <= 400; x += 100) {
    move(x, -275);
    line(x, 275);
  }
  for (let y = -250; y <= 250; y += 100) {
    move(-450, y);
    line(450, y);
  }

  // Rocky planet surface, with a flat central landing shelf.
  renderer.setColor(green);
  renderer.setIntensity(0.8);
  drawPolyline(renderer, [
    [-470, -188], [-410, -215], [-350, -205], [-285, -246],
    [-215, -236], [-160, -272], [-90, -272], [-42, -248],
    [42, -248], [90, -272], [160, -272], [215, -236],
    [285, -246], [350, -205], [410, -215], [470, -188],
  ].map(([x, y]) => project(x, y)));

  // Thrust-style craft and its exhaust.
  renderer.setColor(cyan);
  renderer.setIntensity(1);
  renderer.pushTransform();
  renderer.translate(...project(0, 130));
  renderer.rotate(shipAngle);
  drawPolygonOutline(renderer, [
    [0, 34], [-19, -11], [-10, -5], [-10, -36],
    [10, -36], [10, -5], [19, -11],
  ]);
  renderer.setColor(amber);
  renderer.setIntensity(0.85);
  drawPolyline(renderer, [[-7, -42], [0, -73], [7, -42]]);
  point(0, -73);
  renderer.popTransform();

  // Tractor beam links the craft to a fuel pod above the surface.
  renderer.setColor(cyan);
  renderer.setIntensity(0.45);
  move(-5, 92);
  line(-5, -112);
  move(5, 92);
  line(5, -112);
  renderer.setColor(amber);
  renderer.setIntensity(0.9);
  drawPolygonOutline(renderer, [
    [0, -93], [18, -112], [0, -145], [-18, -112],
  ].map(([x, y]) => project(x, y)));
  renderer.setColor(cyan);
  point(0, -112);

  // Geometric enemies and a shield-like orbit add a second arcade vocabulary.
  renderer.setColor(magenta);
  renderer.setIntensity(0.7);
  drawPolygonOutline(renderer, [
    [-255, 122], [-232, 145], [-209, 122], [-232, 99],
  ].map(([x, y]) => project(x, y)));
  drawCircle(renderer, project(-232, 122), 36);
  renderer.setColor(cyan);
  renderer.setIntensity(0.45);
  drawArc(renderer, project(-232, 122), 54, 205, 335);

  renderer.setColor(green);
  renderer.setIntensity(0.85);
  drawPolygonOutline(renderer, [
    [226, 160], [258, 140], [274, 108], [258, 76],
    [226, 56], [194, 76], [178, 108], [194, 140],
  ].map(([x, y]) => project(x, y)));
  renderer.setColor(cyan);
  renderer.setIntensity(0.45);
  drawEllipse(renderer, project(226, 108), 56, 72);
  renderer.setColor(amber);
  renderer.setIntensity(0.55);
  drawEllipseArc(renderer, project(226, 108), 78, 96, 25, 155);

  // A few bright shots connect the action without suggesting animation.
  renderer.setColor(amber);
  renderer.setIntensity(1);
  move(-152, 78);
  line(-92, 98);
  point(-78, 103);
  move(105, 73);
  line(157, 92);
  point(170, 97);
  renderer.setColor(magenta);
  renderer.setIntensity(0.65);
  move(184, 63);
  line(143, 28);
  point(132, 18);

  // Small stars keep the dark gaps from feeling like unused test-card space.
  renderer.setColor(cyan);
  renderer.setIntensity(0.45);
  for (const [x, y] of [
    [-350, 190], [-125, 225], [90, 210], [355, 205],
    [-365, 15], [-300, -85], [330, -35], [370, -112],
  ]) point(x, y);

  renderer.endFrame();
}

function drawDiagnostic(): void {
  if (scene === "testcard") drawTestCard();
  else if (scene === "segments") drawSegmentStudy(renderer, orientation === "portrait");
  else if (scene === "spacing") drawSpacingStudy(renderer, orientation === "portrait");
  else if (scene === "profile") drawProfileStudy();
  else drawGameScene();
}

function drawProfileStudy(): void {
  const width = orientation === "portrait" ? 768 : 1024;
  const height = orientation === "portrait" ? 1024 : 768;
  const x = -width * 0.35;
  const right = width * 0.35;
  const textHeight = width * 0.024;
  const rows = [
    { label: "BEAM WIDTH", key: "lineWidth", min: 0.5, max: 4, y: 0.25 },
    { label: "POINT RADIUS", key: "pointRadius", min: 0.5, max: 4, y: 0.38 },
    { label: "GLOW STRENGTH", key: "glowStrength", min: 0, max: 2, y: 0.51 },
    { label: "GLOW SPREAD", key: "glowSpread", min: 0.5, max: 2, y: 0.64 },
  ] as const;
  const atY = (fraction: number): number => (0.5 - fraction) * height;

  renderer.beginFrame();
  renderer.setColor(cyan);
  renderer.setIntensity(1);
  drawText(renderer, "DISPLAY PROFILE", x, atY(0.12), { font: "segment16", height: textHeight * 1.25 });
  for (const row of rows) {
    const y = atY(row.y);
    renderer.setColor(amber);
    renderer.setIntensity(1);
    drawText(renderer, `${row.label} ${profile[row.key].toFixed(1)}`, x, atY(row.y - 0.045), { font: "segment16", height: textHeight });
    renderer.setColor(cyan);
    renderer.setIntensity(0.7);
    renderer.moveTo(x, y);
    renderer.lineTo(right, y);
    const knob = x + (right - x) * (profile[row.key] - row.min) / (row.max - row.min);
    renderer.setIntensity(1.5);
    renderer.moveTo(knob, y - textHeight * 0.45);
    renderer.lineTo(knob, y + textHeight * 0.45);
  }
  renderer.setColor(amber);
  renderer.setIntensity(1);
  drawText(renderer, "RESET", x, atY(0.76), { font: "segment16", height: textHeight });
  [1, 1.5, 2].forEach((intensity, index) => {
    const sampleX = x + index * width * 0.23;
    renderer.setColor(amber);
    renderer.setIntensity(1);
    drawText(renderer, intensity.toFixed(1), sampleX, atY(0.81), { font: "segment16", height: textHeight });
    renderer.setColor(cyan);
    renderer.setIntensity(intensity);
    renderer.moveTo(sampleX, atY(0.85));
    renderer.lineTo(sampleX + width * 0.12, atY(0.85));
    renderer.moveTo(sampleX + width * 0.04, atY(0.84));
    renderer.lineTo(sampleX + width * 0.08, atY(0.86));
    renderer.point(sampleX + width * 0.16, atY(0.85));
    renderer.setColor(magenta);
    renderer.moveTo(sampleX, atY(0.93));
    renderer.lineTo(sampleX + width * 0.12, atY(0.93));
    renderer.moveTo(sampleX + width * 0.04, atY(0.92));
    renderer.lineTo(sampleX + width * 0.08, atY(0.94));
    renderer.point(sampleX + width * 0.16, atY(0.93));
  });
  renderer.endFrame();
}

let animationFrame: number | undefined;

function stopAnimation(): void {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  animationFrame = undefined;
}

function animateGame(time: number): void {
  if (!animate || scene !== "game") return;
  drawGameScene((time * 0.03) % 360);
  animationFrame = requestAnimationFrame(animateGame);
}

function renderCurrentScene(): void {
  stopAnimation();
  if (animate && scene === "game") {
    animationFrame = requestAnimationFrame(animateGame);
  } else {
    drawDiagnostic();
  }
}

function syncControls(): void {
  environmentScreen.hidden = activeScreen !== "environment";
  rendererScreen.hidden = activeScreen !== "renderer";
  for (const tab of screenTabs) {
    tab.setAttribute("aria-current", String(tab.dataset.screen === activeScreen ? "page" : "false"));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-cal-mode]")) {
    button.setAttribute("aria-pressed", String(button.dataset.calMode === calibrationMode));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-cal-orientation]")) {
    button.setAttribute("aria-pressed", String(button.dataset.calOrientation === calibrationOrientation));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mapping]")) {
    button.setAttribute("aria-pressed", String(button.dataset.mapping === mappingMode));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-ratio]")) {
    button.setAttribute("aria-pressed", String(button.dataset.ratio === ratioLabel));
  }
  customRatio.hidden = ratioLabel !== "custom";
  genericControls.hidden = calibrationMode !== "generic";
  orientationControl.hidden = calibrationMode !== "omg1";
  widthInput.disabled = autoFitInput.checked;
  widthRange.disabled = autoFitInput.checked;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-scene]")) {
    button.setAttribute("aria-pressed", String(button.dataset.scene === scene));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-orientation]")) {
    button.setAttribute("aria-pressed", String(button.dataset.orientation === orientation));
  }
  animationControl.hidden = scene !== "game";
  animationToggle.checked = animate;
  profileControls.hidden = scene !== "profile";
  studyStageLabel.textContent = `${scene.toUpperCase()} STUDY`;
  for (const input of profileControls.querySelectorAll<HTMLInputElement>("input[data-profile]")) {
    const key = input.dataset.profile;
    if (key === "lineWidth" || key === "pointRadius" || key === "glowStrength" || key === "glowSpread") {
      input.value = String(profile[key]);
      const output = profileControls.querySelector<HTMLOutputElement>(`[data-profile-value="${key}"]`);
      if (output) output.value = profile[key].toFixed(1);
    }
  }
}

for (const tab of screenTabs) {
  tab.addEventListener("click", () => {
    const next = tab.dataset.screen;
    if (next !== "environment" && next !== "renderer") return;
    activeScreen = next;
    syncControls();
    if (activeScreen === "renderer") {
      resizeStudyCanvas();
      renderCurrentScene();
    } else {
      renderCalibration();
    }
  });
}

document.addEventListener("click", (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const selectedScene = target.dataset.scene;
  if (selectedScene === "game" || selectedScene === "testcard" || selectedScene === "segments" || selectedScene === "spacing" || selectedScene === "profile") {
    scene = selectedScene;
    if (scene !== "game") animate = false;
    activeScreen = "renderer";
    syncControls();
    renderCurrentScene();
    return;
  }

  const selectedOrientation = target.dataset.orientation;
  if (selectedOrientation === "landscape" || selectedOrientation === "portrait") {
    if (orientation !== selectedOrientation) {
      orientation = selectedOrientation;
      calibrationOrientation = selectedOrientation;
      stopAnimation();
      const replacement = document.createElement("canvas");
      replacement.id = "screen";
      replacement.setAttribute("aria-label", "Rendering diagnostic display");
      screen.replaceWith(replacement);
      screen = replacement;
      resizeStudyCanvas();
      renderer = createRenderer(screen);
      renderCurrentScene();
    }
    activeScreen = "renderer";
    syncControls();
  }
});

animationToggle.addEventListener("change", () => {
  animate = animationToggle.checked && scene === "game";
  syncControls();
  renderCurrentScene();
});

profileControls.addEventListener("input", (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const key = target.dataset.profile;
  if (key !== "lineWidth" && key !== "pointRadius" && key !== "glowStrength" && key !== "glowSpread") return;
  profile = { ...profile, [key]: Number(target.value) };
  renderer.setDisplayProfile(profile);
  renderCurrentScene();
});

profileReset.addEventListener("click", () => {
  profile = { ...DEFAULT_DISPLAY_PROFILE };
  renderer.setDisplayProfile(profile);
  syncControls();
  renderCurrentScene();
});

window.addEventListener("resize", () => {
  resizeStudyCanvas();
  if (!animate) drawDiagnostic();
  renderCalibration();
});

syncControls();
renderCalibration();
renderCurrentScene();

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-cal-mode]")) {
  button.addEventListener("click", () => {
    if (button.dataset.calMode !== "omg1" && button.dataset.calMode !== "generic") return;
    calibrationMode = button.dataset.calMode;
    chooseManualPreset();
    syncControls();
    renderCalibration();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-cal-orientation]")) {
  button.addEventListener("click", () => {
    if (button.dataset.calOrientation !== "landscape" && button.dataset.calOrientation !== "portrait") return;
    calibrationOrientation = button.dataset.calOrientation;
    syncControls();
    renderCalibration();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-ratio]")) {
  button.addEventListener("click", () => {
    const value = button.dataset.ratio;
    const ratios: Record<string, [number, number]> = { "4:3": [4, 3], "16:9": [16, 9], "1:1": [1, 1], "3:4": [3, 4] };
    if (value === "custom") {
      const width = boundedValue(ratioWidthInput, "Ratio width", 10000);
      const height = boundedValue(ratioHeightInput, "Ratio height", 10000);
      if (width === null || height === null) return;
      targetRatio = width / height;
      ratioLabel = "custom";
    } else if (value && ratios[value]) {
      targetRatio = ratios[value][0] / ratios[value][1];
      ratioLabel = value;
    }
    chooseManualPreset();
    renderCalibration();
    syncControls();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mapping]")) {
  button.addEventListener("click", () => {
    if (button.dataset.mapping !== "fit" && button.dataset.mapping !== "stretch") return;
    mappingMode = button.dataset.mapping;
    chooseManualPreset();
    syncControls();
    renderCalibration();
  });
}

autoFitInput.addEventListener("change", () => {
  if (!autoFitInput.checked) manualWidth = lastCssSize.width;
  syncControls();
  renderCalibration();
});

function acceptManualWidth(input: HTMLInputElement): void {
  const value = boundedValue(input, "Canvas width", 4096);
  if (value === null) return;
  if (value < 64) {
    setCalibrationError("Canvas width must be at least 64 CSS pixels. The previous setting is still active.");
    return;
  }
  manualWidth = value;
  autoFitInput.checked = false;
  chooseManualPreset();
  syncControls();
  renderCalibration();
}

widthInput.addEventListener("input", () => acceptManualWidth(widthInput));
widthRange.addEventListener("input", () => {
  widthInput.value = widthRange.value;
  acceptManualWidth(widthRange);
});

presetSelect.addEventListener("change", () => {
  if (presetSelect.value === "robots") {
    calibrationMode = "omg1";
    calibrationOrientation = "landscape";
    orientation = "landscape";
    targetRatio = 4 / 3;
    ratioLabel = "4:3";
    autoFitInput.checked = true;
    backingScaleSelect.value = "robots";
    manualWidth = 1024;
  } else {
    autoFitInput.checked = false;
    manualWidth = lastCssSize.width;
  }
  syncControls();
  renderCalibration();
});

backingScaleSelect.addEventListener("change", renderCalibration);

for (const input of [ratioWidthInput, ratioHeightInput]) {
  input.addEventListener("change", () => {
    if (ratioLabel !== "custom") return;
    const width = boundedValue(ratioWidthInput, "Ratio width", 10000);
    const height = boundedValue(ratioHeightInput, "Ratio height", 10000);
    if (width === null || height === null) return;
    targetRatio = width / height;
    renderCalibration();
  });
}

for (const input of [virtualWidthInput, virtualHeightInput]) {
  input.addEventListener("change", () => {
    const width = boundedValue(virtualWidthInput, "Virtual width", 10000);
    const height = boundedValue(virtualHeightInput, "Virtual height", 10000);
    if (width === null || height === null) return;
    virtualSize = { width, height };
    chooseManualPreset();
    renderCalibration();
  });
}

resizeHandle.addEventListener("pointerdown", (event: PointerEvent) => {
  event.preventDefault();
  resizePointer = { id: event.pointerId, x: event.clientX, width: lastCssSize.width };
  resizeHandle.setPointerCapture(event.pointerId);
  autoFitInput.checked = false;
  chooseManualPreset();
  syncControls();
});
resizeHandle.addEventListener("pointermove", (event: PointerEvent) => {
  if (!resizePointer || resizePointer.id !== event.pointerId) return;
  manualWidth = Math.max(64, Math.min(4096, resizePointer.width + event.clientX - resizePointer.x));
  widthInput.value = `${Math.round(manualWidth)}`;
  widthRange.value = `${Math.round(manualWidth)}`;
  renderCalibration();
});
const stopResize = (event: PointerEvent): void => {
  if (resizePointer?.id === event.pointerId) resizePointer = null;
};
resizeHandle.addEventListener("pointerup", stopResize);
resizeHandle.addEventListener("pointercancel", stopResize);

const calibrationObserver = new ResizeObserver(() => renderCalibration());
calibrationObserver.observe(calibrationViewport);

function requireContext<T>(context: T | null, name: string): T {
  if (!context) throw new Error(`${name} is unavailable`);
  return context;
}

function requireElement<T extends Element>(element: T | null, name: string): T {
  if (!element) throw new Error(`Missing ${name}`);
  return element;
}
