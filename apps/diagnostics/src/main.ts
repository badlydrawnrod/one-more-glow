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
import { hasEnoughFrameSample, summarizeFrameIntervals, type FrameTimingResult } from "./frame-timing.ts";

registerAppServiceWorker();

let screen = requireElement(document.querySelector<HTMLCanvasElement>("#screen"), "#screen");
const environmentScreen = requireElement(document.querySelector<HTMLElement>("#environment-screen"), "#environment-screen");
const rendererScreen = requireElement(document.querySelector<HTMLElement>("#renderer-screen"), "#renderer-screen");
const studyStageLabel = requireElement(document.querySelector<HTMLElement>("#study-stage-label"), "#study-stage-label");
const screenTabs = [...document.querySelectorAll<HTMLButtonElement>("[data-screen]")];
const workloadControls = requireElement(document.querySelector<HTMLElement>("#workload-controls"), "#workload-controls");
const workloadToggle = requireElement(document.querySelector<HTMLButtonElement>("#workload-toggle"), "#workload-toggle");
const workloadScale = requireElement(document.querySelector<HTMLSelectElement>("#workload-scale"), "#workload-scale");
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
const workbench = requireElement(document.querySelector<HTMLElement>("#workbench"), "#workbench");
const fullscreenToggle = requireElement(document.querySelector<HTMLButtonElement>("#fullscreen-toggle"), "#fullscreen-toggle");
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
type MeasurementSnapshot = {
  trigger: string;
  timestamp: string;
  screen: "environment" | "renderer";
  stage: { left: number; top: number; width: number; height: number };
  canvas: { left: number; top: number; width: number; height: number; backingWidth: number; backingHeight: number };
  visibility: { wholeCanvasVisible: boolean; clippedByStage: boolean; viewport: string };
  aspect: { actual: number; target: number };
  effectiveScale: { x: number; y: number };
  pageOverflow: { horizontal: boolean; vertical: boolean; scrollWidth: number; scrollHeight: number };
  display: Record<string, number | string | null>;
  layoutViewport: { width: number; height: number; rootWidth: number; rootHeight: number };
  visualViewport: { width: number; height: number; scale: number; offsetLeft: number; offsetTop: number } | null;
  orientation: { viewport: string; screenType: string | null; screenAngle: number | null };
  fullscreen: { active: boolean; element: string | null };
};
const measurementHistory: Array<{ trigger: string; time: string; before: string; after: string }> = [];
let previousMeasurement: MeasurementSnapshot | null = null;
let measurementFrame: number | undefined;
const pendingMeasurementTriggers = new Set<string>();
let dprMediaQuery: MediaQueryList | null = null;

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
let studyContext: WebGL2RenderingContext | null = null;
let renderer: DisplayRenderer = createNullRenderer();
let rendererError: string | null = null;
let contextStatus: "ready" | "lost" | "unavailable" = "unavailable";
let animationFrame: number | undefined;
let timingIntervals: number[] = [];
let timingStart: number | null = null;
let previousFrameTime: number | null = null;
let timingResult: FrameTimingResult | null = null;
let lastTimingUiUpdate = 0;
let capabilityDetails = "WebGL2 capability details are unavailable.";

function createNullRenderer(): DisplayRenderer {
  return {
    setDisplayProfile() {}, beginFrame() {}, endFrame() {}, setColor() {}, setIntensity() {},
    pushTransform() {}, popTransform() {}, translate() {}, rotate() {}, scale() {}, moveTo() {}, lineTo() {}, point() {},
  };
}

function aspectRatio(): number {
  return orientation === "landscape" ? 4 / 3 : 3 / 4;
}

function resizeStudyCanvas(): void {
  const ratio = aspectRatio();
  const maxWidth = Math.min(window.innerWidth * 0.96, window.innerHeight * 0.92 * ratio);
  const cssWidth = Math.max(1, Math.min(800, maxWidth));
  const cssHeight = cssWidth / ratio;
  const configuredScale = workloadScale.value === "device" ? (window.devicePixelRatio || 1) : Number(workloadScale.value);
  const requestedScale = Number.isFinite(configuredScale) && configuredScale > 0 ? configuredScale : 1;
  const allocationScale = Math.min(requestedScale, 8192 / cssWidth, 8192 / cssHeight, Math.sqrt(32_000_000 / (cssWidth * cssHeight)));

  const oldWidth = screen.width;
  const oldHeight = screen.height;
  screen.style.width = `${cssWidth}px`;
  screen.style.height = `${cssHeight}px`;
  const backingWidth = Math.max(1, Math.round(cssWidth * allocationScale));
  const backingHeight = Math.max(1, Math.round(cssHeight * allocationScale));
  if (screen.width !== backingWidth) screen.width = backingWidth;
  if (screen.height !== backingHeight) screen.height = backingHeight;
  if (oldWidth !== screen.width || oldHeight !== screen.height) refreshCapabilityDetails();
  if (oldWidth !== screen.width || oldHeight !== screen.height) resetTimingSample();
}

function resetTimingSample(): void {
  timingIntervals = [];
  timingStart = null;
  previousFrameTime = null;
  timingResult = null;
  renderRendererStatus();
}

function attachStudyCanvas(canvas: HTMLCanvasElement): void {
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextStatus = "lost";
    rendererError = null;
    refreshCapabilityDetails();
    resetTimingSample();
    stopAnimation();
    renderRendererStatus();
  });
  canvas.addEventListener("webglcontextrestored", () => {
    const context = canvas.getContext("webgl2", { alpha: true });
    if (!context) {
      contextStatus = "unavailable";
      rendererError = "WebGL2 context restoration failed.";
      renderer = createNullRenderer();
    } else {
      studyContext = context;
      try {
        renderer = createWebGL2Renderer(context, { orientation, profile });
        contextStatus = "ready";
        rendererError = null;
      } catch (error) {
        renderer = createNullRenderer();
        contextStatus = "unavailable";
        rendererError = error instanceof Error ? error.message : "WebGL2 renderer could not be restored.";
      }
    }
    resetTimingSample();
    refreshCapabilityDetails();
    renderCurrentScene();
    renderRendererStatus();
  });
}

function startRenderer(canvas: HTMLCanvasElement): void {
  attachStudyCanvas(canvas);
  try {
    studyContext = canvas.getContext("webgl2", { alpha: true });
    if (!studyContext) throw new Error("WebGL2 is unavailable in this browser.");
    renderer = createWebGL2Renderer(studyContext, { orientation, profile });
    contextStatus = "ready";
    rendererError = null;
  } catch (error) {
    studyContext = null;
    renderer = createNullRenderer();
    contextStatus = "unavailable";
    rendererError = error instanceof Error ? error.message : "WebGL2 could not be initialized.";
  }
  refreshCapabilityDetails();
  renderRendererStatus();
}

resizeStudyCanvas();
startRenderer(screen);

function readWebGLCapabilities(gl: WebGL2RenderingContext): Record<string, unknown> {
  const precision = (shaderType: number): Record<string, number> => {
    const value = gl.getShaderPrecisionFormat(shaderType, gl.HIGH_FLOAT);
    return value ? { rangeMin: value.rangeMin, rangeMax: value.rangeMax, precision: value.precision } : {};
  };
  return {
    contextAttributes: gl.getContextAttributes(),
    version: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
    viewport: Array.from(gl.getParameter(gl.VIEWPORT) as Int32Array),
    drawingBuffer: { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight },
    canvasAttributes: { width: gl.canvas.width, height: gl.canvas.height },
    limits: {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxViewportDimensions: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array),
    },
    extensions: gl.getSupportedExtensions() ?? [],
    shaderPrecision: {
      vertexHighFloat: precision(gl.VERTEX_SHADER),
      fragmentHighFloat: precision(gl.FRAGMENT_SHADER),
    },
    // Renderer and vendor identifiers are intentionally reserved for optional detail.
  };
}

function refreshCapabilityDetails(): void {
  if (!studyContext || contextStatus !== "ready") {
    capabilityDetails = rendererError ?? (contextStatus === "lost" ? "Context is lost; details will refresh after restoration." : "WebGL2 capability details are unavailable.");
    return;
  }
  try { capabilityDetails = JSON.stringify(readWebGLCapabilities(studyContext), null, 2); }
  catch (error) { capabilityDetails = `Capability details unavailable: ${error instanceof Error ? error.message : "browser query failed"}`; }
}

function renderRendererStatus(): void {
  const webgl = document.querySelector<HTMLElement>("#webgl-status");
  const context = document.querySelector<HTMLElement>("#context-status");
  const buffer = document.querySelector<HTMLElement>("#drawing-buffer-size");
  const status = document.querySelector<HTMLElement>("#timing-status");
  const results = document.querySelector<HTMLElement>("#timing-results");
  const capabilities = document.querySelector<HTMLElement>("#webgl-capabilities");
  if (!webgl || !context || !buffer || !status || !results || !capabilities) return;

  webgl.textContent = contextStatus === "ready" ? "Started" : contextStatus === "lost" ? "Interrupted" : "Unavailable";
  context.textContent = contextStatus === "ready" ? "Ready" : contextStatus === "lost" ? "Lost · awaiting restoration" : rendererError ?? "Unavailable";
  buffer.textContent = studyContext
    ? `${studyContext.drawingBufferWidth} × ${studyContext.drawingBufferHeight} px (requested ${screen.width} × ${screen.height})`
    : `${screen.width} × ${screen.height} px requested · unavailable`;
  capabilities.textContent = capabilityDetails;

  workloadToggle.textContent = animate ? "Stop workload" : "Start workload";
  results.hidden = timingResult === null;
  if (!animate) status.textContent = "Idle";
  else if (timingResult) status.textContent = `Results · ${timingResult.duration.toFixed(0)} ms · ${timingResult.count} intervals`;
  else if (activeScreen !== "renderer" || document.hidden) status.textContent = "Collecting paused · workload not visible";
  else status.textContent = contextStatus === "ready"
    ? `Collecting · ${timingIntervals.length} intervals${timingStart === null ? "" : ` · ${Math.max(0, performance.now() - timingStart).toFixed(0)} ms`}`
    : "Collecting paused · WebGL2 unavailable";

  if (timingResult) {
    const set = (selector: string, value: string): void => {
      const item = document.querySelector<HTMLElement>(selector);
      if (item) item.textContent = value;
    };
    set("#timing-fps", timingResult.fps.toFixed(1));
    set("#timing-median", `${timingResult.median.toFixed(2)} ms`);
    set("#timing-p95", `${timingResult.p95.toFixed(2)} ms`);
  }
}

function updateTimingSample(time: number): void {
  if (!animate || activeScreen !== "renderer" || document.hidden || contextStatus !== "ready") return;
  if (timingStart === null) timingStart = time;
  if (previousFrameTime !== null && timingResult === null) {
    timingIntervals.push(time - previousFrameTime);
    if (timingIntervals.length > 600) timingIntervals.shift();
    const duration = time - timingStart;
    if (hasEnoughFrameSample(duration, timingIntervals.length)) {
      timingResult = summarizeFrameIntervals(timingIntervals, duration);
    }
  }
  previousFrameTime = time;
  if (time - lastTimingUiUpdate >= 250 || timingResult) {
    lastTimingUiUpdate = time;
    renderRendererStatus();
  }
}

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
  scheduleMeasurements("settings");
}

function logicalExtent(): string {
  return calibrationOrientation === "landscape" ? "1024 × 768" : "768 × 1024";
}

function roundMeasurement(value: number): number {
  return Math.round(value * 100) / 100;
}

function rectSnapshot(rect: DOMRect): { left: number; top: number; width: number; height: number } {
  return { left: roundMeasurement(rect.left), top: roundMeasurement(rect.top), width: roundMeasurement(rect.width), height: roundMeasurement(rect.height) };
}

function collectMeasurement(trigger: string): MeasurementSnapshot | null {
  const environmentActive = activeScreen === "environment";
  const canvas = environmentActive
    ? calibrationMode === "generic" ? genericCanvas : omgCanvas
    : screen;
  const stage = environmentActive
    ? calibrationViewport
    : requireElement(document.querySelector<HTMLElement>(".canvas-frame"), ".canvas-frame");
  const canvasRect = canvas.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  if (canvasRect.width <= 0 || canvasRect.height <= 0 || stageRect.width <= 0 || stageRect.height <= 0) return null;
  const visual = window.visualViewport;
  const viewportBounds = visual
    ? { left: visual.offsetLeft, top: visual.offsetTop, right: visual.offsetLeft + visual.width, bottom: visual.offsetTop + visual.height, label: "visual viewport" }
    : { left: 0, top: 0, right: document.documentElement.clientWidth, bottom: document.documentElement.clientHeight, label: "layout viewport" };
  const visibleBounds = {
    left: Math.max(stageRect.left, viewportBounds.left),
    top: Math.max(stageRect.top, viewportBounds.top),
    right: Math.min(stageRect.right, viewportBounds.right),
    bottom: Math.min(stageRect.bottom, viewportBounds.bottom),
  };
  const clippedByStage = canvasRect.left < stageRect.left || canvasRect.top < stageRect.top || canvasRect.right > stageRect.right || canvasRect.bottom > stageRect.bottom;
  const wholeCanvasVisible = canvasRect.left >= visibleBounds.left && canvasRect.top >= visibleBounds.top
    && canvasRect.right <= visibleBounds.right && canvasRect.bottom <= visibleBounds.bottom;
  const actualRatio = canvasRect.width / canvasRect.height;
  const target = environmentActive ? targetRatio : aspectRatio();
  const root = document.documentElement;
  const screenOrientation = window.screen.orientation;
  const dpr = window.devicePixelRatio || 1;
  return {
    trigger,
    timestamp: new Date().toISOString(),
    screen: activeScreen,
    stage: rectSnapshot(stageRect),
    canvas: {
      ...rectSnapshot(canvasRect),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
    },
    visibility: { wholeCanvasVisible, clippedByStage, viewport: viewportBounds.label },
    aspect: { actual: roundMeasurement(actualRatio), target: roundMeasurement(target) },
    effectiveScale: { x: roundMeasurement(canvas.width / canvasRect.width), y: roundMeasurement(canvas.height / canvasRect.height) },
    pageOverflow: {
      horizontal: root.scrollWidth > root.clientWidth,
      vertical: root.scrollHeight > root.clientHeight,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
    },
    display: {
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      availableWidth: window.screen.availWidth,
      availableHeight: window.screen.availHeight,
      devicePixelRatio: dpr,
    },
    layoutViewport: { width: window.innerWidth, height: window.innerHeight, rootWidth: root.clientWidth, rootHeight: root.clientHeight },
    visualViewport: visual ? {
      width: roundMeasurement(visual.width), height: roundMeasurement(visual.height), scale: roundMeasurement(visual.scale),
      offsetLeft: roundMeasurement(visual.offsetLeft), offsetTop: roundMeasurement(visual.offsetTop),
    } : null,
    orientation: {
      viewport: window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
      screenType: screenOrientation?.type ?? null,
      screenAngle: screenOrientation?.angle ?? null,
    },
    fullscreen: { active: document.fullscreenElement !== null, element: document.fullscreenElement?.id || document.fullscreenElement?.tagName || null },
  };
}

function conciseMeasurement(snapshot: MeasurementSnapshot): string {
  return `${snapshot.canvas.width} × ${snapshot.canvas.height} CSS px at ${snapshot.canvas.left}, ${snapshot.canvas.top}; ${snapshot.canvas.backingWidth} × ${snapshot.canvas.backingHeight} px; fit ${snapshot.visibility.wholeCanvasVisible ? "yes" : "no"}; DPR ${snapshot.display.devicePixelRatio}`;
}

function renderMeasurement(snapshot: MeasurementSnapshot): void {
  const fit = snapshot.visibility.wholeCanvasVisible ? "Yes" : `No${snapshot.visibility.clippedByStage ? " · stage clipped" : ""}`;
  const ratio = `${snapshot.aspect.actual.toFixed(3)} / ${snapshot.aspect.target.toFixed(3)}`;
  const stage = `${snapshot.stage.width.toFixed(0)} × ${snapshot.stage.height.toFixed(0)} CSS px`;
  const effective = `${snapshot.effectiveScale.x.toFixed(2)}× / ${snapshot.effectiveScale.y.toFixed(2)}×`;
  const orientationText = `${snapshot.display.devicePixelRatio}× / ${snapshot.orientation.viewport}${snapshot.orientation.screenType ? ` · ${snapshot.orientation.screenType}` : ""}`;
  const overflow = `H ${snapshot.pageOverflow.horizontal ? "yes" : "no"} · V ${snapshot.pageOverflow.vertical ? "yes" : "no"}`;
  if (snapshot.screen === "environment") {
    requireElement(document.querySelector<HTMLElement>("#fit-summary"), "#fit-summary").textContent = fit;
    requireElement(document.querySelector<HTMLElement>("#ratio-summary"), "#ratio-summary").textContent = ratio;
    requireElement(document.querySelector<HTMLElement>("#stage-summary"), "#stage-summary").textContent = stage;
    requireElement(document.querySelector<HTMLElement>("#effective-scale-summary"), "#effective-scale-summary").textContent = effective;
    requireElement(document.querySelector<HTMLElement>("#display-summary"), "#display-summary").textContent = orientationText;
    requireElement(document.querySelector<HTMLElement>("#overflow-summary"), "#overflow-summary").textContent = overflow;
    requireElement(document.querySelector<HTMLElement>("#fullscreen-summary"), "#fullscreen-summary").textContent = snapshot.fullscreen.active ? "Active" : "Off";
    requireElement(document.querySelector<HTMLElement>("#raw-measurements"), "#raw-measurements").textContent = JSON.stringify(snapshot, null, 2);
  } else {
    requireElement(document.querySelector<HTMLElement>("#renderer-fit-summary"), "#renderer-fit-summary").textContent = fit;
    requireElement(document.querySelector<HTMLElement>("#renderer-rect-summary"), "#renderer-rect-summary").textContent = `${snapshot.canvas.width} × ${snapshot.canvas.height} / ${stage}`;
    requireElement(document.querySelector<HTMLElement>("#renderer-overflow-summary"), "#renderer-overflow-summary").textContent = overflow;
    requireElement(document.querySelector<HTMLElement>("#renderer-fullscreen-summary"), "#renderer-fullscreen-summary").textContent = snapshot.fullscreen.active ? "Active" : "Off";
    requireElement(document.querySelector<HTMLElement>("#renderer-raw-measurements"), "#renderer-raw-measurements").textContent = JSON.stringify(snapshot, null, 2);
  }
}

function renderHistory(): void {
  for (const list of document.querySelectorAll<HTMLOListElement>("#measurement-history")) {
    list.replaceChildren();
    if (measurementHistory.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = "No changes recorded.";
      list.append(empty);
      continue;
    }
    for (const entry of measurementHistory) {
      const item = document.createElement("li");
      item.textContent = `${entry.time} · ${entry.trigger}: ${entry.before} → ${entry.after}`;
      list.append(item);
    }
  }
}

function scheduleMeasurements(trigger: string): void {
  pendingMeasurementTriggers.add(trigger);
  if (measurementFrame !== undefined) return;
  measurementFrame = requestAnimationFrame(() => {
    measurementFrame = undefined;
    const cause = [...pendingMeasurementTriggers].join(", ");
    pendingMeasurementTriggers.clear();
    const next = collectMeasurement(cause || trigger);
    if (!next) return;
    if (previousMeasurement && JSON.stringify({ ...previousMeasurement, trigger: "", timestamp: "" }) !== JSON.stringify({ ...next, trigger: "", timestamp: "" })) {
      measurementHistory.push({ trigger: cause || "measurement", time: new Date().toLocaleTimeString(), before: conciseMeasurement(previousMeasurement), after: conciseMeasurement(next) });
      if (measurementHistory.length > 8) measurementHistory.shift();
      renderHistory();
    }
    previousMeasurement = next;
    renderMeasurement(next);
    updateFullscreenControl();
  });
}

function updateFullscreenControl(): void {
  const active = document.fullscreenElement === workbench;
  fullscreenToggle.textContent = active ? "Exit fullscreen" : "Enter fullscreen";
  fullscreenToggle.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (workbench.requestFullscreen) await workbench.requestFullscreen();
    else throw new Error("Fullscreen is unavailable in this browser.");
  } catch (error) {
    const status = activeScreen === "environment"
      ? environmentScreen.querySelector<HTMLElement>(".action-status")
      : rendererScreen.querySelector<HTMLElement>(".action-status");
    if (status) status.textContent = error instanceof Error ? error.message : "Fullscreen could not be changed.";
  }
}

function createReport(): string {
  const snapshot = collectMeasurement("report");
  if (snapshot) {
    previousMeasurement = snapshot;
    renderMeasurement(snapshot);
  }
  const frameTiming = !animate
    ? "Idle"
    : timingResult
      ? `Results · ${timingResult.fps.toFixed(1)} FPS · median ${timingResult.median.toFixed(2)} ms · p95 ${timingResult.p95.toFixed(2)} ms · ${timingResult.duration.toFixed(0)} ms · ${timingResult.count} intervals`
      : contextStatus !== "ready" || activeScreen !== "renderer" || document.hidden
        ? `Collecting paused · ${timingIntervals.length} intervals`
        : `Collecting · ${timingIntervals.length} intervals`;
  return [
    "One More Glow · Diagnostics report",
    `Captured: ${new Date().toISOString()}`,
    `Screen: ${activeScreen}`,
    `Study: ${scene}${scene === "game" ? ` · animation ${animate ? "on" : "off"}` : ""}`,
    `Workload backing scale: ${workloadScale.value === "device" ? `device (${(window.devicePixelRatio || 1).toFixed(2)}×)` : `${workloadScale.value}×`}`,
    `WebGL2: ${contextStatus === "ready" ? "started · context ready" : contextStatus === "lost" ? "context lost" : `unavailable${rendererError ? ` · ${rendererError}` : ""}`}`,
    `Requested drawing buffer: ${screen.width} × ${screen.height} px`,
    `Actual drawing buffer: ${studyContext && contextStatus === "ready" ? `${studyContext.drawingBufferWidth} × ${studyContext.drawingBufferHeight} px` : "unavailable"}`,
    `Workload: ${scene === "game" ? `rotating Game scene · ${animate ? "running" : "stopped"}` : "inactive for selected study"}`,
    `Frame timing: ${frameTiming}`,
    "WebGL2 capabilities:",
    studyContext && contextStatus === "ready" ? JSON.stringify(readWebGLCapabilities(studyContext), null, 2) : "Unavailable.",
    `Calibration: ${calibrationMode} · ${calibrationOrientation} · ${ratioLabel} · ${autoFitInput.checked ? "auto fit" : `manual ${manualWidth} CSS px`}`,
    `Mapping: ${mappingMode} · virtual ${virtualSize.width} × ${virtualSize.height} · backing choice ${backingScaleSelect.value}`,
    `Display profile: beam ${profile.lineWidth}, point ${profile.pointRadius}, glow ${profile.glowStrength}, spread ${profile.glowSpread}`,
    "",
    "Browser measurements:",
    snapshot ? JSON.stringify(snapshot, null, 2) : "Unavailable: active canvas or stage has no measurable area.",
    "",
    "Recent changes:",
    ...(measurementHistory.length ? measurementHistory.map((entry) => `${entry.time} · ${entry.trigger}: ${entry.before} -> ${entry.after}`) : ["No changes recorded."]),
  ].join("\n");
}

fullscreenToggle.addEventListener("click", () => void toggleFullscreen());
document.addEventListener("fullscreenchange", () => {
  updateFullscreenControl();
  scheduleMeasurements("fullscreen");
});

for (const button of document.querySelectorAll<HTMLButtonElement>(".report-button")) {
  button.addEventListener("click", async () => {
    const panel = button.closest<HTMLElement>(".panel");
    const status = panel?.querySelector<HTMLElement>(".action-status");
    const fallback = panel?.querySelector<HTMLTextAreaElement>(".report-fallback");
    const report = createReport();
    if (!status || !fallback) return;
    fallback.value = report;
    fallback.hidden = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(report);
      status.textContent = "Report copied to the clipboard.";
    } catch {
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      status.textContent = "Clipboard unavailable. The report is selected below for copying.";
    }
  });
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

function stopAnimation(): void {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  animationFrame = undefined;
}

function animateGame(time: number): void {
  if (!animate || scene !== "game" || activeScreen !== "renderer" || document.hidden || contextStatus !== "ready") return;
  drawGameScene((time * 0.03) % 360);
  updateTimingSample(time);
  animationFrame = requestAnimationFrame(animateGame);
}

function renderCurrentScene(): void {
  stopAnimation();
  if (contextStatus !== "ready") {
    renderRendererStatus();
    return;
  }
  if (activeScreen !== "renderer" || document.hidden) return;
  if (animate && scene === "game") {
    animationFrame = requestAnimationFrame(animateGame);
  } else {
    drawDiagnostic();
  }
  renderRendererStatus();
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
  workloadControls.hidden = scene !== "game";
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
    if (activeScreen !== "renderer") {
      stopAnimation();
      resetTimingSample();
    }
    syncControls();
    if (activeScreen === "renderer") {
      resizeStudyCanvas();
      renderCurrentScene();
    } else {
      renderCalibration();
    }
    scheduleMeasurements("screen switch");
  });
}

document.addEventListener("click", (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const selectedScene = target.dataset.scene;
  if (selectedScene === "game" || selectedScene === "testcard" || selectedScene === "segments" || selectedScene === "spacing" || selectedScene === "profile") {
    scene = selectedScene;
    if (scene !== "game") {
      animate = false;
      resetTimingSample();
    }
    activeScreen = "renderer";
    syncControls();
    renderCurrentScene();
    scheduleMeasurements("study selection");
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
      startRenderer(screen);
      resetTimingSample();
      renderCurrentScene();
    }
    activeScreen = "renderer";
    syncControls();
    scheduleMeasurements("orientation");
  }
});

workloadToggle.addEventListener("click", () => {
  animate = !animate && scene === "game";
  resetTimingSample();
  syncControls();
  if (!animate) drawDiagnostic();
  else renderCurrentScene();
});

workloadScale.addEventListener("change", () => {
  resizeStudyCanvas();
  resetTimingSample();
  if (activeScreen === "renderer" && !animate && contextStatus === "ready") drawDiagnostic();
  renderRendererStatus();
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
  if (!animate && activeScreen === "renderer" && contextStatus === "ready") drawDiagnostic();
  renderCalibration();
  scheduleMeasurements("resize");
});
window.addEventListener("scroll", () => scheduleMeasurements("scroll"), true);
window.addEventListener("orientationchange", () => scheduleMeasurements("orientation"));
window.screen.orientation?.addEventListener("change", () => scheduleMeasurements("orientation"));
window.visualViewport?.addEventListener("resize", () => scheduleMeasurements("visual viewport resize"));
window.visualViewport?.addEventListener("scroll", () => scheduleMeasurements("visual viewport scroll"));

function watchDevicePixelRatio(): void {
  dprMediaQuery?.removeEventListener("change", onDevicePixelRatioChange);
  dprMediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  dprMediaQuery.addEventListener("change", onDevicePixelRatioChange, { once: true });
}
function onDevicePixelRatioChange(): void {
  watchDevicePixelRatio();
  resizeStudyCanvas();
  if (!animate && activeScreen === "renderer" && contextStatus === "ready") drawDiagnostic();
  renderCalibration();
  scheduleMeasurements("DPR change");
}
watchDevicePixelRatio();

document.addEventListener("visibilitychange", () => {
  resetTimingSample();
  if (document.hidden) stopAnimation();
  else if (activeScreen === "renderer") renderCurrentScene();
});

syncControls();
renderCalibration();
renderCurrentScene();
scheduleMeasurements("initial");

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
resizeHandle.addEventListener("keydown", (event: KeyboardEvent) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
  const amount = event.shiftKey ? 10 : 1;
  autoFitInput.checked = false;
  manualWidth = Math.max(64, Math.min(4096, manualWidth + direction * amount));
  widthInput.value = String(manualWidth);
  widthRange.value = String(manualWidth);
  chooseManualPreset();
  syncControls();
  renderCalibration();
});

type NumericEdit = { input: HTMLInputElement; originalValue: string };
type SelectEdit = { select: HTMLSelectElement; originalValue: string };
let numericEdit: NumericEdit | null = null;
let selectEdit: SelectEdit | null = null;
let selectMenu: HTMLDivElement | null = null;
let previousPadButtons = new Set<number>();
let previousPadIndex: number | null = null;
let nextPadRepeatAt = 0;
let repeatedPadDirection = "";
let repeatedEditDirection = "";
let nextPadEditAt = 0;
let requirePadNeutral = false;
let fullscreenInitiator: HTMLButtonElement | null = null;
const gamepadStatus = requireElement(document.querySelector<HTMLElement>("#gamepad-status"), "#gamepad-status");

function visibleEnabledControls(): HTMLElement[] {
  const candidates = document.querySelectorAll<HTMLElement>(
    "button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])",
  );
  return [...candidates].filter((element) => {
    if (element.closest("[hidden], [inert]")) return false;
    if (element.matches(":disabled, [aria-disabled='true']")) return false;
    const closedDetails = element.closest("details:not([open])");
    if (closedDetails && !element.matches("summary")) return false;
    return element.getClientRects().length > 0;
  });
}

function focusControl(element: HTMLElement): void {
  document.querySelectorAll<HTMLElement>(".gamepad-focused").forEach((focused) => focused.classList.remove("gamepad-focused"));
  element.focus();
  element.classList.add("gamepad-focused");
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
}

document.addEventListener("focusin", (event: FocusEvent) => {
  const target = event.target;
  document.querySelectorAll<HTMLElement>(".gamepad-focused").forEach((focused) => {
    if (focused !== target) focused.classList.remove("gamepad-focused");
  });
});

function moveControlFocus(direction: -1 | 1): void {
  const controls = visibleEnabledControls();
  if (!controls.length) return;
  const index = controls.indexOf(document.activeElement as HTMLElement);
  const next = index < 0
    ? (direction > 0 ? 0 : controls.length - 1)
    : (index + direction + controls.length) % controls.length;
  focusControl(controls[next]);
}

function closeOpenDetails(): boolean {
  const active = document.activeElement;
  const focusedDetails = active instanceof HTMLElement ? active.closest<HTMLDetailsElement>("details[open]") : null;
  const details = focusedDetails ?? [...document.querySelectorAll<HTMLDetailsElement>("details[open]")].at(-1) ?? null;
  if (!details) return false;
  const summary = details.querySelector<HTMLElement>("summary");
  details.open = false;
  if (summary) focusControl(summary);
  return true;
}

function cancelNumericEdit(): void {
  if (!numericEdit) return;
  const { input, originalValue } = numericEdit;
  numericEdit = null;
  input.value = originalValue;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  gamepadStatus.textContent = "Numeric edit cancelled.";
}

function acceptNumericEdit(): void {
  if (!numericEdit) return;
  const { input } = numericEdit;
  numericEdit = null;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  gamepadStatus.textContent = "Numeric edit accepted.";
}

function beginNumericEdit(input: HTMLInputElement): boolean {
  if (input.type !== "number" && input.type !== "range") return false;
  numericEdit = { input, originalValue: input.value };
  gamepadStatus.textContent = `Editing ${input.getAttribute("aria-label") ?? input.labels?.[0]?.textContent?.trim() ?? "value"}. Left/right is fine; up/down is coarse. A accepts; B cancels.`;
  return true;
}

function beginSelectEdit(select: HTMLSelectElement): boolean {
  if (select.disabled || select.options.length < 2) return false;
  selectEdit = { select, originalValue: select.value };
  selectMenu = document.createElement("div");
  selectMenu.className = "gamepad-select-menu";
  selectMenu.setAttribute("role", "listbox");
  selectMenu.setAttribute("aria-hidden", "true");
  for (const option of select.options) {
    const item = document.createElement("div");
    item.className = "gamepad-select-option";
    item.textContent = option.text;
    item.setAttribute("role", "option");
    if (option.disabled) item.classList.add("is-disabled");
    selectMenu.append(item);
  }
  document.body.append(selectMenu);
  updateSelectMenu();
  gamepadStatus.textContent = `Choosing ${select.labels[0]?.textContent?.trim() ?? "option"}. Use a direction to change; A accepts; B cancels.`;
  return true;
}

function updateSelectMenu(): void {
  if (!selectEdit || !selectMenu) return;
  const { select } = selectEdit;
  const rect = select.getBoundingClientRect();
  const menuHeight = Math.min(240, window.innerHeight - 16);
  const contentHeight = Math.min(menuHeight, select.options.length * 34);
  const placeBelow = window.innerHeight - rect.bottom >= contentHeight;
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8));
  selectMenu.style.left = `${left}px`;
  selectMenu.style.top = `${placeBelow ? rect.bottom : Math.max(8, rect.top - contentHeight)}px`;
  selectMenu.style.width = `${rect.width}px`;
  selectMenu.style.maxHeight = `${menuHeight}px`;
  [...selectMenu.children].forEach((child, index) => {
    const option = select.options[index];
    child.setAttribute("aria-selected", String(index === select.selectedIndex));
    child.classList.toggle("is-selected", index === select.selectedIndex);
    child.classList.toggle("is-disabled", option.disabled);
  });
  selectMenu.children[select.selectedIndex]?.scrollIntoView({ block: "nearest" });
}

function finishSelectEdit(accept: boolean): void {
  if (!selectEdit) return;
  const { select, originalValue } = selectEdit;
  selectEdit = null;
  selectMenu?.remove();
  selectMenu = null;
  if (accept) {
    select.dispatchEvent(new Event("change", { bubbles: true }));
    gamepadStatus.textContent = "Choice accepted.";
  } else {
    select.value = originalValue;
    gamepadStatus.textContent = "Choice cancelled.";
  }
}

function moveSelectChoice(direction: number): void {
  if (!selectEdit || !direction) return;
  const { select } = selectEdit;
  const enabled = [...select.options].map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);
  if (!enabled.length) return;
  const current = enabled.indexOf(select.selectedIndex);
  const next = (current + (direction > 0 ? 1 : -1) + enabled.length) % enabled.length;
  select.selectedIndex = enabled[next];
  select.dispatchEvent(new Event("input", { bubbles: true }));
  updateSelectMenu();
  gamepadStatus.textContent = `${select.options[select.selectedIndex]?.text ?? "Option"}. A accepts; B cancels.`;
}

function shouldRepeatEdit(horizontal: number, vertical: number, time: number): boolean {
  const direction = `${horizontal}:${vertical}`;
  if (direction === "0:0") {
    repeatedEditDirection = "";
    nextPadEditAt = 0;
    return false;
  }
  if (direction !== repeatedEditDirection) {
    repeatedEditDirection = direction;
    nextPadEditAt = time + 300;
    return true;
  }
  if (time < nextPadEditAt) return false;
  nextPadEditAt = time + 100;
  return true;
}

function adjustNumericEdit(horizontal: number, vertical: number): void {
  if (!numericEdit) return;
  const input = numericEdit.input;
  const stepValue = Number(input.step);
  const step = Number.isFinite(stepValue) && stepValue > 0 ? stepValue : 1;
  const coarseStep = step * (input.type === "range" ? 5 : 10);
  const delta = horizontal * step - vertical * coarseStep;
  if (!delta) return;
  const min = input.min === "" ? -Infinity : Number(input.min);
  const max = input.max === "" ? Infinity : Number(input.max);
  const current = Number(input.value);
  const base = Number.isFinite(current) ? current : (Number.isFinite(min) ? min : 0);
  const next = Math.max(min, Math.min(max, base + delta));
  input.value = String(Number(next.toFixed(6)));
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function activateFocusedControl(): void {
  const focused = document.activeElement;
  if (!(focused instanceof HTMLElement)) return;
  if (focused instanceof HTMLInputElement) {
    if (beginNumericEdit(focused)) return;
    if (focused.type === "checkbox") focused.click();
    return;
  }
  if (focused instanceof HTMLSelectElement && beginSelectEdit(focused)) return;
  if (focused instanceof HTMLButtonElement || focused.matches("summary")) {
    focused.click();
  }
}

function cancelGamepadAction(): void {
  if (numericEdit) {
    cancelNumericEdit();
    return;
  }
  if (selectEdit) {
    finishSelectEdit(false);
    return;
  }
  closeOpenDetails();
}

function switchScreenFromGamepad(screenName: "environment" | "renderer"): void {
  const tab = screenTabs.find((candidate) => candidate.dataset.screen === screenName);
  if (!tab) return;
  tab.click();
  focusControl(tab);
}

function clearGamepadState(requireNeutral: boolean): void {
  previousPadButtons.clear();
  previousPadIndex = null;
  repeatedPadDirection = "";
  repeatedEditDirection = "";
  nextPadRepeatAt = 0;
  nextPadEditAt = 0;
  requirePadNeutral = requireNeutral;
  if (numericEdit) cancelNumericEdit();
  if (selectEdit) finishSelectEdit(false);
}

function pollGamepad(time: number): void {
  const pad = Array.from(navigator.getGamepads?.() ?? []).find((candidate) => candidate?.connected && candidate.mapping === "standard") ?? null;
  if (!pad) {
    if (previousPadIndex !== null) clearGamepadState(false);
    if (gamepadStatus.textContent !== "Connect a standard-mapped gamepad to navigate.") {
      gamepadStatus.textContent = "Connect a standard-mapped gamepad to navigate.";
    }
    requestAnimationFrame(pollGamepad);
    return;
  }
  if (previousPadIndex !== pad.index) {
    previousPadButtons = new Set(Array.from(pad.buttons, (button, index) => button.pressed ? index : -1).filter((index) => index >= 0));
    previousPadIndex = pad.index;
    requirePadNeutral = true;
    gamepadStatus.textContent = "Standard gamepad connected. Release held controls to begin.";
  }
  if (!document.hasFocus() || document.hidden) {
    clearGamepadState(true);
    requestAnimationFrame(pollGamepad);
    return;
  }

  const down = (index: number): boolean => pad.buttons[index]?.pressed ?? false;
  const buttonsNeutral = Array.from(pad.buttons).every((button) => !button.pressed);
  const axesNeutral = (pad.axes[0] ?? 0) ** 2 + (pad.axes[1] ?? 0) ** 2 < 0.25 ** 2;
  if (requirePadNeutral) {
    if (buttonsNeutral && axesNeutral) requirePadNeutral = false;
    previousPadButtons = new Set(Array.from(pad.buttons, (button, index) => button.pressed ? index : -1).filter((index) => index >= 0));
    requestAnimationFrame(pollGamepad);
    return;
  }

  const buttonEdge = (index: number): boolean => down(index) && !previousPadButtons.has(index);
  const dpadX = Number(down(15)) - Number(down(14));
  const dpadY = Number(down(13)) - Number(down(12));
  const axisX = Math.abs(pad.axes[0] ?? 0) > 0.25 ? Math.sign(pad.axes[0] ?? 0) : 0;
  const axisY = Math.abs(pad.axes[1] ?? 0) > 0.25 ? Math.sign(pad.axes[1] ?? 0) : 0;
  const horizontal = dpadX || axisX;
  const vertical = dpadY || axisY;
  if (numericEdit) {
    if (shouldRepeatEdit(horizontal, vertical, time)) adjustNumericEdit(horizontal, vertical);
    if (buttonEdge(0)) acceptNumericEdit();
    if (buttonEdge(1)) cancelNumericEdit();
  } else if (selectEdit) {
    updateSelectMenu();
    if (shouldRepeatEdit(horizontal, vertical, time)) moveSelectChoice(horizontal || vertical);
    if (buttonEdge(0)) finishSelectEdit(true);
    if (buttonEdge(1)) finishSelectEdit(false);
  } else {
    const direction = vertical || horizontal;
    const directionKey = direction === 0 ? "" : String(direction);
    if (!directionKey) {
      repeatedPadDirection = "";
      nextPadRepeatAt = 0;
    } else if (directionKey !== repeatedPadDirection || time >= nextPadRepeatAt) {
      moveControlFocus(direction as -1 | 1);
      repeatedPadDirection = directionKey;
      nextPadRepeatAt = time + (repeatedPadDirection === directionKey && nextPadRepeatAt === 0 ? 360 : 150);
    }
    if (buttonEdge(0)) activateFocusedControl();
    if (buttonEdge(1)) cancelGamepadAction();
    if (buttonEdge(4)) switchScreenFromGamepad("environment");
    if (buttonEdge(5)) switchScreenFromGamepad("renderer");
  }
  previousPadButtons = new Set(Array.from(pad.buttons, (button, index) => button.pressed ? index : -1).filter((index) => index >= 0));
  requestAnimationFrame(pollGamepad);
}

window.addEventListener("blur", () => clearGamepadState(true));
window.addEventListener("focus", () => { requirePadNeutral = true; });
window.addEventListener("gamepaddisconnected", () => clearGamepadState(false));
window.addEventListener("gamepadconnected", () => { gamepadStatus.textContent = "Gamepad connected; checking for standard mapping."; });
document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;
  if (numericEdit) {
    event.preventDefault();
    cancelNumericEdit();
  } else if (selectEdit) {
    event.preventDefault();
    finishSelectEdit(false);
  } else if (closeOpenDetails()) {
    event.preventDefault();
  } else if (document.fullscreenElement) {
    event.preventDefault();
    fullscreenInitiator = fullscreenToggle;
    void document.exitFullscreen().then(() => fullscreenInitiator?.focus()).catch(() => {});
  }
});
fullscreenToggle.addEventListener("click", () => { fullscreenInitiator = fullscreenToggle; });
requestAnimationFrame(pollGamepad);

const calibrationObserver = new ResizeObserver(() => renderCalibration());
calibrationObserver.observe(calibrationViewport);
const studyStage = document.querySelector<HTMLElement>(".canvas-frame");
if (studyStage) new ResizeObserver(() => scheduleMeasurements("stage resize")).observe(studyStage);

function requireElement<T extends Element>(element: T | null, name: string): T {
  if (!element) throw new Error(`Missing ${name}`);
  return element;
}
