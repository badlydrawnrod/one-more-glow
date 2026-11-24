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
import { ASPECT_PRESETS, aspectDimensions, aspectRatio, fitCanvasSize, genericMap, planBackingAllocation, swapDimensions, type AspectOrientation, type AspectPreset, type CanvasSize } from "./calibration-sizing.ts";
import { hasEnoughFrameSample, summarizeFrameIntervals, type FrameTimingResult } from "./frame-timing.ts";
import { DiagnosticsDeviceInput, isGamepadNeutral } from "./device-input.ts";

registerAppServiceWorker();

let screen = requireElement(document.querySelector<HTMLCanvasElement>("#screen"), "#screen");
const environmentScreen = requireElement(document.querySelector<HTMLElement>("#environment-screen"), "#environment-screen");
const rendererScreen = requireElement(document.querySelector<HTMLElement>("#renderer-screen"), "#renderer-screen");
const studyStageLabel = requireElement(document.querySelector<HTMLElement>("#study-stage-label"), "#study-stage-label");
const studyStage = requireElement(document.querySelector<HTMLElement>(".canvas-frame"), ".canvas-frame");
const screenTabs = [...document.querySelectorAll<HTMLButtonElement>("[data-screen]")];
const workloadControls = requireElement(document.querySelector<HTMLElement>("#workload-controls"), "#workload-controls");
const workloadToggle = requireElement(document.querySelector<HTMLButtonElement>("#workload-toggle"), "#workload-toggle");
const workloadScale = requireElement(document.querySelector<HTMLSelectElement>("#workload-scale"), "#workload-scale");
const profileControls = requireElement(document.querySelector<HTMLElement>("#profile-controls"), "#profile-controls");
const profileCompare = requireElement(document.querySelector<HTMLButtonElement>("#profile-compare"), "#profile-compare");
const profileReset = requireElement(document.querySelector<HTMLButtonElement>("#profile-reset"), "#profile-reset");
const calibrationViewport = requireElement(document.querySelector<HTMLElement>("#calibration-viewport"), "#calibration-viewport");
const genericCanvas = requireElement(document.querySelector<HTMLCanvasElement>("#calibration-generic"), "#calibration-generic");
let omgCanvas = requireElement(document.querySelector<HTMLCanvasElement>("#calibration-omg"), "#calibration-omg");
const resizeHandle = requireElement(document.querySelector<HTMLButtonElement>("#resize-handle"), "#resize-handle");
const widthInput = requireElement(document.querySelector<HTMLInputElement>("#manual-width"), "#manual-width");
const widthControl = requireElement(document.querySelector<HTMLElement>("#manual-width-control"), "#manual-width-control");
const robotsReset = requireElement(document.querySelector<HTMLButtonElement>("#use-robots-settings"), "#use-robots-settings");
const referenceStatus = requireElement(document.querySelector<HTMLElement>("#reference-status"), "#reference-status");
const sizeModeButtons = document.querySelectorAll<HTMLButtonElement>("[data-size-mode]");
const backingScaleSelect = requireElement(document.querySelector<HTMLSelectElement>("#backing-scale"), "#backing-scale");
const canvasRatioWidthInput = requireElement(document.querySelector<HTMLInputElement>("#canvas-ratio-width"), "#canvas-ratio-width");
const canvasRatioHeightInput = requireElement(document.querySelector<HTMLInputElement>("#canvas-ratio-height"), "#canvas-ratio-height");
const virtualWidthInput = requireElement(document.querySelector<HTMLInputElement>("#virtual-width"), "#virtual-width");
const virtualHeightInput = requireElement(document.querySelector<HTMLInputElement>("#virtual-height"), "#virtual-height");
const canvasCustomAspect = requireElement(document.querySelector<HTMLElement>("#canvas-custom-aspect"), "#canvas-custom-aspect");
const contentCustomAspect = requireElement(document.querySelector<HTMLElement>("#content-custom-aspect"), "#content-custom-aspect");
const calibrationError = requireElement(document.querySelector<HTMLElement>("#calibration-error"), "#calibration-error");
const advancedCalibrationError = requireElement(document.querySelector<HTMLElement>("#advanced-calibration-error"), "#advanced-calibration-error");
const calibrationModeLabel = requireElement(document.querySelector<HTMLElement>("#calibration-mode-label"), "#calibration-mode-label");
const canvasSizeValue = requireElement(document.querySelector<HTMLElement>("#canvas-size-value"), "#canvas-size-value");
const backingSizeValue = requireElement(document.querySelector<HTMLElement>("#backing-size-value"), "#backing-size-value");
const mappingValue = requireElement(document.querySelector<HTMLElement>("#mapping-value"), "#mapping-value");
const workbench = requireElement(document.querySelector<HTMLElement>("#workbench"), "#workbench");
const fullscreenToggle = requireElement(document.querySelector<HTMLButtonElement>("#fullscreen-toggle"), "#fullscreen-toggle");
let profile: DisplayProfile = { ...DEFAULT_DISPLAY_PROFILE };
let compareWithDefaults = false;

type CalibrationMode = "omg1" | "generic";
type MappingMode = "letterbox" | "stretch" | "crop";
let calibrationMode: CalibrationMode = "omg1";
let mappingMode: MappingMode = "letterbox";
let canvasOrientation: AspectOrientation = "landscape";
let contentOrientation: AspectOrientation = "landscape";
let canvasAspectPreset: AspectPreset = "4:3";
let contentAspectPreset: AspectPreset = "4:3";
let targetRatio = 4 / 3;
let ratioLabel = "4:3";
let virtualSize: CanvasSize = { width: 1024, height: 768 };
let canvasCustomSize: CanvasSize = { width: 4, height: 3 };
let contentCustomSize: CanvasSize = { width: 1024, height: 768 };
let automaticSize = true;
let manualWidth = 1024;
let lastCssSize: CanvasSize = { width: 1, height: 1 };
let calibrationAllocation: ReturnType<typeof planBackingAllocation> | null = null;
let studyAllocation: ReturnType<typeof planBackingAllocation> | null = null;
type CalibrationSurface = {
  canvas: HTMLCanvasElement;
  context: WebGL2RenderingContext | null;
  renderer: DisplayRenderer | null;
  error: string | null;
};
const omgSurfaces = new Map<DisplayOrientation, CalibrationSurface>();
let genericBufferAvailable = false;
let resizePointer: { id: number; x: number; width: number } | null = null;
type MeasurementSnapshot = {
  trigger: string;
  timestamp: string;
  screen: "environment" | "renderer";
  test: string;
  settings: { sizeMode: "auto" | "manual"; requestedWidth: number | null; canvasAspect: string; contentAspect: string; mapping: MappingMode }
    | { orientation: DisplayOrientation; profile: DisplayProfile };
  stage: { left: number; top: number; width: number; height: number };
  canvas: { left: number; top: number; width: number; height: number };
  visibility: { withinBrowserViewport: boolean; clippedByStage: boolean; viewport: string };
  aspect: { actual: number; target: number };
  mapping: string;
  backing: {
    policy: string;
    requestedScale: number;
    appliedScale: number;
    requested: CanvasSize;
    attributes: CanvasSize;
    buffer: CanvasSize | null;
    effectiveScale: { x: number; y: number } | null;
    reasons: string[];
  };
  rendering: { backend: "Canvas 2D" | "WebGL2"; status: string };
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
const studyNames: Record<Scene, string> = {
  game: "Game scene", testcard: "Test Card", segments: "Segment text · Glyphs",
  spacing: "Segment text · Spacing", profile: "Display profile",
};
const studyCues: Record<Scene, string> = {
  game: "Start frame timing to compare the same rotating scene at two backing scales.",
  testcard: "Inspect joins and endpoints, compare curves and transforms, and look for halo changes above 1.0 intensity.",
  segments: "Compare matching glyphs in the two fonts. The 22-segment chart includes lowercase, punctuation and descenders.",
  spacing: "Compare the same text at each size. Look for tight punctuation pairs and check whether scores keep their alignment.",
  profile: "Compare the same beam samples with the edited profile and defaults. Inspect core width, point size and halo.",
};
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
type TimingConditions = {
  css: CanvasSize;
  buffer: CanvasSize;
  profile: DisplayProfile;
  orientation: DisplayOrientation;
  scale: string;
};
type TimingRun = { result: FrameTimingResult; conditions: TimingConditions };
let timingConditions: TimingConditions | null = null;
let timingSampleComplete = false;
let lastTimingUiUpdate = 0;
const completedTimingRuns: TimingRun[] = [];

function createNullRenderer(): DisplayRenderer {
  return {
    setDisplayProfile() {}, beginFrame() {}, endFrame() {}, setColor() {}, setIntensity() {},
    pushTransform() {}, popTransform() {}, translate() {}, rotate() {}, scale() {}, moveTo() {}, lineTo() {}, point() {},
  };
}

function studyAspectRatio(): number {
  return orientation === "landscape" ? 4 / 3 : 3 / 4;
}

function stageBounds(stage: HTMLElement) {
  const rect = stage.getBoundingClientRect();
  return {
    left: rect.left + stage.clientLeft,
    top: rect.top + stage.clientTop,
    width: rect.width - stage.clientLeft * 2,
    height: rect.height - stage.clientTop * 2,
  };
}

function fitStageToViewport(stage: HTMLElement, ratio: number): CanvasSize {
  const scroll = document.fullscreenElement === workbench ? workbench.scrollTop : window.scrollY;
  const rect = stage.getBoundingClientRect();
  stage.style.setProperty("--stage-height", `${Math.floor(window.innerHeight - rect.top - scroll - 16)}px`);
  const naturalHeight = (rect.width - 2 * stage.clientLeft) / ratio + 2 * stage.clientTop;
  stage.style.setProperty("--natural-stage-height", `${Math.ceil(naturalHeight)}px`);
  return stageBounds(stage);
}

function sizeCanvas(canvas: HTMLCanvasElement, css: CanvasSize): CanvasSize {
  canvas.style.width = `${css.width}px`;
  canvas.style.height = `${css.height}px`;
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function setCanvasBacking(canvas: HTMLCanvasElement, size: CanvasSize): boolean {
  if (canvas.width === size.width && canvas.height === size.height) return false;
  if (canvas.width !== size.width) canvas.width = size.width;
  if (canvas.height !== size.height) canvas.height = size.height;
  return true;
}

function resizeStudyCanvas(): void {
  if (rendererScreen.hidden) return;
  const stage = fitStageToViewport(studyStage, studyAspectRatio());
  const measured = sizeCanvas(screen, fitCanvasSize(stage, studyAspectRatio(), 800));
  const configuredScale = scene !== "game" || workloadScale.value === "device" ? (window.devicePixelRatio || 1) : Number(workloadScale.value);
  const requestedScale = Number.isFinite(configuredScale) && configuredScale > 0 ? configuredScale : 1;
  studyAllocation = planBackingAllocation(measured, requestedScale);
  const changed = setCanvasBacking(screen, studyAllocation.applied);
  const cssChanged = timingConditions && (timingConditions.css.width !== measured.width || timingConditions.css.height !== measured.height);
  if (changed || cssChanged) resetTimingSample();
}

function resetTimingSample(): void {
  timingIntervals = [];
  timingStart = null;
  previousFrameTime = null;
  timingConditions = null;
  timingSampleComplete = false;
  lastTimingUiUpdate = 0;
  renderRendererStatus();
}

function attachStudyCanvas(canvas: HTMLCanvasElement): void {
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    if (canvas !== screen) return;
    contextStatus = "lost";
    rendererError = null;
    resetTimingSample();
    stopAnimation();
    scheduleMeasurements("WebGL2 context lost");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    if (canvas !== screen) return;
    const context = canvas.getContext("webgl2", { alpha: true });
    studyContext = context;
    if (!context) {
      contextStatus = "unavailable";
      rendererError = "WebGL2 context restoration failed.";
      renderer = createNullRenderer();
    } else {
      try {
        renderer = createWebGL2Renderer(context, { orientation, profile: activeDisplayProfile() });
        contextStatus = "ready";
        rendererError = null;
      } catch (error) {
        renderer = createNullRenderer();
        contextStatus = "unavailable";
        rendererError = error instanceof Error ? error.message : "WebGL2 renderer could not be restored.";
      }
    }
    resetTimingSample();
    renderCurrentScene();
    scheduleMeasurements("WebGL2 context restored");
  });
}

function startRenderer(canvas: HTMLCanvasElement): void {
  attachStudyCanvas(canvas);
  try {
    studyContext = canvas.getContext("webgl2", { alpha: true });
    if (!studyContext) throw new Error("WebGL2 is unavailable in this browser.");
    renderer = createWebGL2Renderer(studyContext, { orientation, profile: activeDisplayProfile() });
    contextStatus = "ready";
    rendererError = null;
  } catch (error) {
    studyContext = null;
    renderer = createNullRenderer();
    contextStatus = "unavailable";
    rendererError = error instanceof Error ? error.message : "WebGL2 could not be initialized.";
  }
  renderRendererStatus();
}

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

function renderCapabilities(): void {
  const environmentActive = activeScreen === "environment";
  const output = document.querySelector(environmentActive ? "#calibration-capabilities" : "#webgl-capabilities");
  if (!output?.closest("details")?.open) return;
  const gl = environmentActive ? omgSurfaces.get(contentOrientation)?.context : studyContext;
  try {
    output.textContent = gl && !gl.isContextLost()
      ? JSON.stringify(readWebGLCapabilities(gl), null, 2)
      : "WebGL2 capability details are unavailable.";
  } catch {
    output.textContent = "The browser could not provide WebGL2 capability details.";
  }
}

function timingStatus(): string {
  if (!animate || scene !== "game") return "Idle";
  if (activeScreen !== "renderer" || document.hidden) return "Paused · workload hidden";
  if (!drawingBufferSize(studyContext) || contextStatus !== "ready") return "Paused · WebGL2 buffer unavailable";
  if (timingSampleComplete) return "Sample complete · workload running";
  const seconds = timingStart === null || previousFrameTime === null ? 0 : (previousFrameTime - timingStart) / 1000;
  return `Collecting · ${seconds.toFixed(1)} s · ${timingIntervals.length} intervals (2 s and 30 intervals minimum)`;
}

function renderRendererStatus(): void {
  const running = animate && scene === "game" && activeScreen === "renderer";
  workloadToggle.textContent = running ? "Stop" : "Run frame timing";
  workloadToggle.disabled = !running && (contextStatus !== "ready" || !drawingBufferSize(studyContext));
  writeValue("timing-status", timingStatus());
}

function describeTimingConditions(conditions: TimingConditions): string {
  return `${dimensions(conditions.css)} CSS px · ${dimensions(conditions.buffer)} px buffer · ${conditions.scale} · ${conditions.orientation} · ${profileSummary(conditions.profile)}`;
}

function describeTimingResult(result: FrameTimingResult): string[] {
  return [
    `Median ${result.median.toFixed(2)} ms · p95 ${result.p95.toFixed(2)} ms`,
    `${result.fps.toFixed(1)} FPS · ${(result.duration / 1000).toFixed(2)} s · ${result.count} intervals`,
  ];
}

function renderTimingRuns(): void {
  const container = requireElement(document.getElementById("timing-results"), "#timing-results");
  container.replaceChildren();
  container.hidden = completedTimingRuns.length === 0;
  for (const [index, run] of completedTimingRuns.entries()) {
    const card = document.createElement("section");
    card.className = "timing-run";
    const heading = document.createElement("h4");
    heading.textContent = index === 0 ? "Latest completed run" : "Previous completed run";
    const [primary, details] = describeTimingResult(run.result);
    const metrics = document.createElement("strong");
    metrics.textContent = primary;
    const secondary = document.createElement("p");
    secondary.textContent = details;
    const conditions = document.createElement("p");
    conditions.textContent = describeTimingConditions(run.conditions);
    card.append(heading, metrics, secondary, conditions);
    container.append(card);
  }
}

function timingReportLines(): string[] {
  return [
    `Browser frame timing: ${timingStatus()}`,
    ...completedTimingRuns.flatMap((run, index) => [
      index === 0 ? "Latest completed run" : "Previous completed run",
      ...describeTimingResult(run.result),
      describeTimingConditions(run.conditions),
    ]),
  ];
}

function updateTimingSample(time: number): void {
  if (timingSampleComplete) return;
  if (timingStart === null) {
    const buffer = drawingBufferSize(studyContext);
    if (!buffer) return;
    const { width, height } = screen.getBoundingClientRect();
    const scale = workloadScale.value === "device" ? `Device scale (${window.devicePixelRatio || 1}× requested)` : `${workloadScale.value}× requested`;
    timingConditions = { css: { width, height }, buffer, profile: { ...profile }, orientation, scale };
    timingStart = time;
  }
  if (previousFrameTime !== null) timingIntervals.push(time - previousFrameTime);
  previousFrameTime = time;
  const duration = time - timingStart;
  if (timingConditions && hasEnoughFrameSample(duration, timingIntervals.length)) {
    const result = summarizeFrameIntervals(timingIntervals, duration);
    if (result) {
      timingSampleComplete = true;
      completedTimingRuns.unshift({ result, conditions: timingConditions });
      completedTimingRuns.splice(2);
      renderTimingRuns();
    } else {
      resetTimingSample();
    }
  }
  if (time - lastTimingUiUpdate >= 250 || timingSampleComplete) {
    lastTimingUiUpdate = time;
    renderRendererStatus();
  }
}

function initializeCalibrationSurface(surface: CalibrationSurface, orientation: DisplayOrientation): void {
  surface.renderer = null;
  surface.error = null;
  try {
    surface.context = surface.canvas.getContext("webgl2", { alpha: true });
    if (!surface.context) throw new Error("WebGL2 is unavailable in this browser.");
    surface.renderer = createWebGL2Renderer(surface.context, { orientation });
  } catch (error) {
    surface.error = error instanceof Error ? error.message : "WebGL2 could not start.";
  }
}

function ensureCalibrationSurface(): CalibrationSurface {
  const orientation = contentOrientation;
  let surface = omgSurfaces.get(orientation);
  if (!surface) {
    const canvas = orientation === "landscape" ? omgCanvas : document.createElement("canvas");
    canvas.className = "calibration-canvas";
    canvas.id = orientation === "landscape" ? "calibration-omg" : "calibration-omg-portrait";
    canvas.setAttribute("aria-label", `OMG-1 ${orientation} calibration pattern`);
    const next = { canvas, context: null, renderer: null, error: null };
    surface = next;
    omgSurfaces.set(orientation, next);
    initializeCalibrationSurface(next, orientation);
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      if (canvas === omgCanvas) scheduleMeasurements("WebGL2 context lost");
    });
    canvas.addEventListener("webglcontextrestored", () => {
      initializeCalibrationSurface(next, orientation);
      if (canvas === omgCanvas && calibrationMode === "omg1") renderCalibration("WebGL2 context restored");
    });
  }
  if (omgCanvas !== surface.canvas) {
    omgCanvas.replaceWith(surface.canvas);
    omgCanvas = surface.canvas;
  }
  return surface;
}

function selectedBackingScale(): number {
  const dpr = window.devicePixelRatio || 1;
  const value = backingScaleSelect.value;
  if (value === "robots") return Math.min(dpr, 2);
  if (value === "device") return dpr;
  return Number(value);
}

function setCalibrationError(message = "", input = widthInput): void {
  calibrationError.textContent = input === widthInput ? message : "";
  advancedCalibrationError.textContent = input === widthInput ? "" : message;
}

function boundedValue(input: HTMLInputElement, label: string): number | null {
  const value = input.valueAsNumber;
  if (!Number.isInteger(value) || value < Number(input.min) || value > Number(input.max)) {
    setCalibrationError(`${label} needs a whole number from ${input.min} to ${input.max}.`, input);
    return null;
  }
  setCalibrationError();
  return value;
}

function drawGenericCalibration(css: CanvasSize, backing: CanvasSize, backingChanged: boolean): void {
  const ctx = genericCanvas.getContext("2d");
  if (!ctx || ctx.isContextLost?.()) {
    genericBufferAvailable = false;
    return;
  }
  const dprX = backing.width / css.width;
  const dprY = backing.height / css.height;
  ctx.setTransform(dprX, 0, 0, dprY, 0, 0);
  ctx.fillStyle = "#05080e";
  ctx.fillRect(0, 0, css.width, css.height);
  if (backingChanged || !genericBufferAvailable) {
    try {
      genericBufferAvailable = ctx.getImageData(backing.width - 1, backing.height - 1, 1, 1).data[3] !== 0;
    } catch {
      genericBufferAvailable = false;
    }
    if (!genericBufferAvailable) return;
  }
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
  ctx.strokeRect(-halfW, -halfH, virtualSize.width, virtualSize.height);
  for (const [x, y] of [[-halfW, -halfH], [halfW, -halfH], [-halfW, halfH], [halfW, halfH]]) {
    ctx.fillStyle = "#fff4ce"; ctx.fillRect(x - 5, y - 5, 10, 10);
  }
  ctx.restore();
}

function drawOmgCalibration(target: DisplayRenderer): void {
  const logical = logicalSize(contentOrientation);
  const content = virtualSize;
  const backing = { width: omgCanvas.width, height: omgCanvas.height };
  const mapped = genericMap(backing, content, mappingMode);
  const fitScale = Math.min(backing.width / logical.width, backing.height / logical.height);
  const edgeX = content.width * 0.44;
  const edgeY = content.height * 0.44;
  target.beginFrame();
  target.pushTransform();
  target.scale(mapped.scaleX / fitScale, mapped.scaleY / fitScale);
  target.setColor([0.3, 0.75, 0.82]); target.setIntensity(0.25);
  for (let i = -4; i <= 4; i++) {
    target.moveTo(i * logical.width / 10, -edgeY); target.lineTo(i * logical.width / 10, edgeY);
    target.moveTo(-edgeX, i * logical.height / 10); target.lineTo(edgeX, i * logical.height / 10);
  }
  target.setColor([0, 0.9, 1]); target.setIntensity(0.95);
  target.moveTo(-edgeX, 0); target.lineTo(edgeX, 0); target.moveTo(0, -edgeY); target.lineTo(0, edgeY);
  target.setColor([1, 0.72, 0.3]); target.setIntensity(1);
  const square = Math.min(content.width, content.height) * 0.42;
  target.moveTo(-square / 2, -square / 2); target.lineTo(square / 2, -square / 2);
  target.lineTo(square / 2, square / 2); target.lineTo(-square / 2, square / 2); target.lineTo(-square / 2, -square / 2);
  drawCircle(target, [0, 0], square * 0.34);
  target.setColor([0.9, 0.4, 1]); target.setIntensity(0.9);
  target.moveTo(-edgeX * 0.88, -edgeY * 0.88); target.lineTo(edgeX * 0.88, edgeY * 0.88);
  target.moveTo(edgeX * 0.88, -edgeY * 0.88); target.lineTo(-edgeX * 0.88, edgeY * 0.88);
  target.setColor([0.7, 1, 0.45]);
  const halfWidth = content.width / 2;
  const halfHeight = content.height / 2;
  target.moveTo(-halfWidth, -halfHeight); target.lineTo(halfWidth, -halfHeight); target.lineTo(halfWidth, halfHeight); target.lineTo(-halfWidth, halfHeight); target.lineTo(-halfWidth, -halfHeight);
  for (const [px, py] of [[-halfWidth, -halfHeight], [halfWidth, -halfHeight], [-halfWidth, halfHeight], [halfWidth, halfHeight]]) target.point(px, py);
  target.popTransform();
  target.endFrame();
}

function positionResizeHandle(css: CanvasSize, area: CanvasSize): void {
  const x = Math.max(12, Math.min(area.width - 12, (area.width + css.width) / 2));
  const y = Math.max(12, Math.min(area.height - 12, (area.height + css.height) / 2));
  resizeHandle.style.left = `${x}px`;
  resizeHandle.style.top = `${y}px`;
}

function renderCalibration(trigger = "calibration settings"): void {
  if (environmentScreen.hidden) return;
  const stage = fitStageToViewport(calibrationViewport, targetRatio);
  if (stage.width <= 1 || stage.height <= 1) return;
  const css = automaticSize ? fitCanvasSize(stage, targetRatio, 1024) : { width: manualWidth, height: manualWidth / targetRatio };
  const scale = selectedBackingScale();
  const surface = calibrationMode === "omg1" ? ensureCalibrationSurface() : null;
  genericCanvas.hidden = calibrationMode !== "generic";
  omgCanvas.hidden = calibrationMode !== "omg1";
  const activeCanvas = surface?.canvas ?? genericCanvas;
  const measured = sizeCanvas(activeCanvas, css);
  calibrationAllocation = planBackingAllocation(measured, scale);
  const backingChanged = setCanvasBacking(activeCanvas, calibrationAllocation.applied);
  lastCssSize = measured;
  if (surface) {
    if (surface.renderer && drawingBufferSize(surface.context)) drawOmgCalibration(surface.renderer);
  } else {
    drawGenericCalibration(measured, calibrationAllocation.applied, backingChanged);
  }
  positionResizeHandle(measured, stage);
  if (automaticSize) widthInput.value = String(Math.round(measured.width));
  calibrationModeLabel.textContent = calibrationMode === "omg1" ? `OMG-1 / ${contentOrientation.toUpperCase()}` : "CANVAS 2D";
  scheduleMeasurements(trigger);
}

function logicalSize(orientation: DisplayOrientation): CanvasSize {
  return orientation === "landscape" ? { width: 1024, height: 768 } : { width: 768, height: 1024 };
}

function contentSizeLabel(): string {
  return `${Math.round(virtualSize.width * 100) / 100} × ${Math.round(virtualSize.height * 100) / 100}`;
}

function aspectLabel(preset: AspectPreset, orientation: AspectOrientation, custom: CanvasSize): string {
  if (preset === "custom") return `${custom.width}:${custom.height}`;
  const [width, height] = preset.split(":");
  return orientation === "portrait" && preset !== "1:1" ? `${height}:${width}` : preset;
}

function refreshAspectSettings(): void {
  targetRatio = aspectRatio(canvasAspectPreset, canvasOrientation, canvasCustomSize);
  ratioLabel = aspectLabel(canvasAspectPreset, canvasOrientation, canvasCustomSize);
  virtualSize = aspectDimensions(contentAspectPreset, contentOrientation, contentCustomSize);
}

function drawingBufferSize(context: WebGL2RenderingContext | null): CanvasSize | null {
  if (!context || context.isContextLost()) return null;
  const { drawingBufferWidth: width, drawingBufferHeight: height } = context;
  return width > 0 && height > 0 ? { width, height } : null;
}

function roundMeasurement(value: number): number {
  return Math.round(value * 100) / 100;
}

function rectSnapshot(rect: { left: number; top: number; width: number; height: number }): typeof rect {
  return { left: roundMeasurement(rect.left), top: roundMeasurement(rect.top), width: roundMeasurement(rect.width), height: roundMeasurement(rect.height) };
}

function collectMeasurement(trigger: string): MeasurementSnapshot | null {
  const environmentActive = activeScreen === "environment";
  const canvas = environmentActive
    ? calibrationMode === "generic" ? genericCanvas : omgCanvas
    : screen;
  const stage = environmentActive ? calibrationViewport : studyStage;
  const allocation = environmentActive ? calibrationAllocation : studyAllocation;
  if (!allocation) return null;
  const canvasRect = canvas.getBoundingClientRect();
  const stageRect = stageBounds(stage);
  if (canvasRect.width <= 0 || canvasRect.height <= 0 || stageRect.width <= 0 || stageRect.height <= 0) return null;
  const containingStage = { ...stageRect, right: stageRect.left + stageRect.width, bottom: stageRect.top + stageRect.height };
  const visual = window.visualViewport;
  const viewportBounds = visual
    ? { left: visual.offsetLeft, top: visual.offsetTop, right: visual.offsetLeft + visual.width, bottom: visual.offsetTop + visual.height, label: "visual viewport" }
    : { left: 0, top: 0, right: document.documentElement.clientWidth, bottom: document.documentElement.clientHeight, label: "layout viewport" };
  const isInside = (bounds: { left: number; top: number; right: number; bottom: number }): boolean => {
    const tolerance = 0.05;
    return canvasRect.left >= bounds.left - tolerance && canvasRect.top >= bounds.top - tolerance
      && canvasRect.right <= bounds.right + tolerance && canvasRect.bottom <= bounds.bottom + tolerance;
  };
  const generic = environmentActive && calibrationMode === "generic";
  const surface = environmentActive ? omgSurfaces.get(contentOrientation) : undefined;
  const gl = environmentActive ? surface?.context ?? null : studyContext;
  const rendererReady = environmentActive ? !!surface?.renderer : contextStatus === "ready";
  const attributes = { width: canvas.width, height: canvas.height };
  const buffer = generic && genericBufferAvailable ? attributes : generic || !rendererReady ? null : drawingBufferSize(gl);
  const renderingError = environmentActive ? surface?.error : rendererError;
  const status = buffer ? "Ready"
    : generic ? "Canvas 2D buffer unavailable"
    : gl?.isContextLost() || (!environmentActive && contextStatus === "lost") ? "Context lost · awaiting restoration"
    : renderingError ?? "Drawing buffer unavailable";
  const dpr = window.devicePixelRatio || 1;
  const choice = environmentActive ? backingScaleSelect.value : scene === "game" ? workloadScale.value : "device";
  const requestedScale = choice === "robots" ? Math.min(dpr, 2) : choice === "device" ? dpr : Number(choice);
  const policy = choice === "robots" ? "Device scale (max 2×)" : choice === "device" ? "Device scale" : "Manual scale";
  const reasons: string[] = [];
  if (choice === "robots" && dpr > 2) reasons.push(`Device scale ${dpr.toFixed(2)}× capped at 2×`);
  if (choice !== "robots" && choice !== "device" && requestedScale !== dpr) reasons.push(`Manual scale at ${dpr.toFixed(2)}× DPR`);
  if (allocation.limit) reasons.push(allocation.limit);
  if (buffer && (buffer.width !== attributes.width || buffer.height !== attributes.height)) reasons.push("Browser allocated a different buffer");
  if (!allocation.limit && (Math.abs(attributes.width - canvasRect.width * requestedScale) > 0.01
    || Math.abs(attributes.height - canvasRect.height * requestedScale) > 0.01)) reasons.push("Rounded to whole backing pixels");
  const logical = environmentActive ? virtualSize : logicalSize(orientation);
  const map = genericMap(canvasRect, logical, mappingMode);
  const mapping = mappingMode === "stretch"
    ? Math.abs(map.scaleX - map.scaleY) < 0.001 ? "Stretch · proportions preserved"
      : map.scaleX > map.scaleY ? "Stretch · content stretched wider" : "Stretch · content stretched taller"
    : mappingMode === "crop"
      ? map.offsetX < -0.25 ? "Crop · cropped at the sides"
        : map.offsetY < -0.25 ? "Crop · cropped top and bottom" : "Crop · no cropping"
      : map.offsetX > 0.25 ? "Letterbox · empty space at the sides"
        : map.offsetY > 0.25 ? "Letterbox · empty space above and below" : "Letterbox · no empty bars";
  const actualRatio = canvasRect.width / canvasRect.height;
  const target = environmentActive ? targetRatio : studyAspectRatio();
  const root = document.documentElement;
  const screenOrientation = window.screen.orientation;
  return {
    trigger,
    timestamp: new Date().toISOString(),
    screen: activeScreen,
    test: environmentActive ? generic ? "Canvas 2D calibration" : `OMG-1 calibration · ${contentOrientation}` : studyNames[scene],
    settings: environmentActive
      ? { sizeMode: automaticSize ? "auto" : "manual", requestedWidth: automaticSize ? null : manualWidth, canvasAspect: `${ratioLabel} ${canvasOrientation}`, contentAspect: `${contentSizeLabel()} ${contentOrientation}`, mapping: mappingMode }
      : { orientation, profile: activeDisplayProfile() },
    stage: rectSnapshot(stageRect),
    canvas: rectSnapshot(canvasRect),
    visibility: { withinBrowserViewport: isInside(viewportBounds), clippedByStage: !isInside(containingStage), viewport: viewportBounds.label },
    aspect: { actual: roundMeasurement(actualRatio * 100) / 100, target: roundMeasurement(target * 100) / 100 },
    mapping: `${mapping} · ${logical.width} × ${logical.height} content`,
    backing: {
      policy, requestedScale, appliedScale: allocation.scale, requested: allocation.requested, attributes, buffer,
      effectiveScale: buffer ? { x: roundMeasurement(buffer.width / canvasRect.width), y: roundMeasurement(buffer.height / canvasRect.height) } : null,
      reasons,
    },
    rendering: { backend: generic ? "Canvas 2D" : "WebGL2", status },
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

function dimensions(size: CanvasSize): string {
  return `${size.width} × ${size.height}`;
}

function backingSummary(backing: MeasurementSnapshot["backing"]): string {
  const request = `${dimensions(backing.requested)} px requested at ${backing.requestedScale.toFixed(2)}×`;
  if (!backing.buffer || !backing.effectiveScale) return ["Buffer unavailable", request, ...backing.reasons].join(" · ");
  const { x, y } = backing.effectiveScale;
  const effective = x === y ? `${x.toFixed(2)}×` : `${x.toFixed(2)}× / ${y.toFixed(2)}×`;
  const buffer = `${dimensions(backing.buffer)} px · ${effective} effective`;
  const changed = backing.buffer.width !== backing.requested.width || backing.buffer.height !== backing.requested.height;
  const roundingVisible = Math.abs(x - backing.requestedScale) >= 0.01 || Math.abs(y - backing.requestedScale) >= 0.01;
  const reasons = backing.reasons.filter((reason) => roundingVisible || reason !== "Rounded to whole backing pixels");
  return [buffer, ...(changed ? [request] : []), ...reasons].join(" · ");
}

function conciseMeasurement(snapshot: MeasurementSnapshot): string {
  const { canvas, backing, visibility } = snapshot;
  return `${snapshot.test} · ${dimensions(canvas)} CSS px at ${canvas.left}, ${canvas.top} · ${backing.buffer ? dimensions(backing.buffer) : "buffer unavailable"} · ${visibility.clippedByStage ? "stage clipped" : "inside stage"} · ${visibility.withinBrowserViewport ? "in view" : "outside view"} · DPR ${snapshot.display.devicePixelRatio}`;
}

function writeValue(id: string, text: string): void {
  const element = requireElement(document.getElementById(id), id);
  if (element.textContent !== text) element.textContent = text;
}

function renderMeasurement(snapshot: MeasurementSnapshot): void {
  const testArea = snapshot.visibility.clippedByStage ? "Canvas clipped" : "Canvas fits";
  const browser = snapshot.visibility.withinBrowserViewport ? "Whole canvas in view" : "Canvas extends outside view";
  const css = `${dimensions(snapshot.canvas)} CSS px`;
  const backing = backingSummary(snapshot.backing);
  if (snapshot.screen === "environment") {
    writeValue("stage-clipping-summary", testArea);
    writeValue("fit-summary", browser);
    mappingValue.textContent = snapshot.mapping;
    canvasSizeValue.textContent = css;
    backingSizeValue.textContent = backing;
    writeValue("calibration-rendering-status", `${snapshot.rendering.backend} · ${snapshot.rendering.status}`);
    writeValue("raw-measurements", JSON.stringify(snapshot, null, 2));
  } else {
    writeValue("renderer-stage-clipping-summary", testArea);
    writeValue("renderer-fit-summary", browser);
    writeValue("renderer-rect-summary", css);
    writeValue("context-status", snapshot.rendering.status);
    writeValue("drawing-buffer-size", backing);
    writeValue("renderer-raw-measurements", JSON.stringify(snapshot, null, 2));
  }
  renderCapabilities();
}

function renderHistory(): void {
  for (const list of document.querySelectorAll<HTMLOListElement>(".measurement-history")) {
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
  if (!snapshot) return "One More Glow · Diagnostics report\nActive canvas measurements are unavailable.";
  renderMeasurement(snapshot);
  return [
    `One More Glow · ${snapshot.test}`,
    `Captured: ${snapshot.timestamp}`,
    `Test area: ${snapshot.visibility.clippedByStage ? "Canvas clipped" : "Canvas fits"}`,
    `Browser view: ${snapshot.visibility.withinBrowserViewport ? "Whole canvas in view" : "Canvas extends outside view"}`,
    `Canvas: ${dimensions(snapshot.canvas)} CSS px`,
    `Mapping: ${snapshot.mapping}`,
    `Backing resolution: ${backingSummary(snapshot.backing)}`,
    `Rendering: ${snapshot.rendering.backend} · ${snapshot.rendering.status}`,
    ...(snapshot.screen === "renderer" ? [`Display profile: ${profileSummary()}`] : []),
    ...(snapshot.screen === "renderer" && scene === "game" ? timingReportLines() : []),
    "",
    "Browser and canvas details:",
    JSON.stringify(snapshot, null, 2),
  ].join("\n");
}

fullscreenToggle.addEventListener("click", () => void toggleFullscreen());
document.addEventListener("fullscreenchange", () => {
  updateFullscreenControl();
  renderCalibration();
  resizeStudyCanvas();
  renderCurrentScene();
  scheduleMeasurements("fullscreen");
});

for (const button of document.querySelectorAll<HTMLButtonElement>(".report-button")) {
  button.addEventListener("click", async () => {
    const panel = button.closest<HTMLElement>(".panel, .study-report");
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
  const { width, height } = logicalSize(orientation);
  const w = (fraction: number): number => width * fraction;
  const h = (fraction: number): number => height * fraction;
  const left = w(-0.41);
  const right = w(0.41);
  const heading = (label: string, y: number): void => {
    renderer.setColor(amber);
    renderer.setIntensity(0.72);
    drawText(renderer, label, left, y, { font: "segment16", height: w(0.027) });
  };
  const rule = (y: number): void => {
    renderer.setColor(cyan);
    renderer.setIntensity(0.15);
    renderer.moveTo(left, y);
    renderer.lineTo(right, y);
  };

  renderer.beginFrame();
  heading("JOINS AND ENDPOINTS", h(0.36));
  const joinsY = h(0.237);
  for (const [intensity, y] of [[1, joinsY], [0.55, joinsY - h(0.076)]]) {
    renderer.setIntensity(intensity);
    renderer.setColor(magenta);
    drawPolyline(renderer, [
      [left, y - h(0.022)], [w(-0.35), y + h(0.022)],
      [w(-0.29), y - h(0.022)], [w(-0.23), y + h(0.022)],
    ]);
    renderer.setColor(green);
    drawPolygonOutline(renderer, [
      [w(-0.1), y + h(0.024)], [w(0.10), y + h(0.024)],
      [w(0.07), y - h(0.024)], [w(-0.07), y - h(0.024)],
    ]);
  }
  renderer.setColor(amber);
  renderer.setIntensity(0.8);
  drawPolygonOutline(renderer, [[w(0.23), h(0.146)], [w(0.30), h(0.28)], [w(0.37), h(0.146)]]);
  renderer.setColor(cyan);
  renderer.setIntensity(1);
  renderer.moveTo(w(0.19), h(0.198));
  renderer.lineTo(right, h(0.198));
  renderer.point(w(0.3), h(0.198));

  rule(h(0.105));
  heading("CURVES AND TRANSFORMS", h(0.042));
  const curvesY = h(-0.078);
  renderer.setIntensity(0.8);
  renderer.setColor(amber);
  drawCircle(renderer, [w(-0.34), curvesY], w(0.038));
  renderer.setColor(magenta);
  drawArc(renderer, [w(-0.34), curvesY], w(0.056), 24, 154);
  renderer.setColor(green);
  drawEllipse(renderer, [w(-0.14), curvesY], w(0.052), w(0.03));
  renderer.setColor(cyan);
  drawEllipseArc(renderer, [w(-0.14), curvesY], w(0.067), w(0.045), 204, 336);
  renderer.setColor(amber);
  for (const [x, angle, scale] of [[0.09, -22, 0.8], [0.22, 0, 1], [0.36, 22, 1.25]]) {
    renderer.pushTransform();
    renderer.translate(w(x), curvesY);
    renderer.rotate(angle);
    renderer.scale(scale, scale);
    drawPolygonOutline(renderer, [[0, w(0.035)], [w(-0.024), w(-0.025)], [0, w(-0.012)], [w(0.024), w(-0.025)]]);
    renderer.popTransform();
  }

  rule(h(-0.175));
  heading("OVERDRIVE", h(-0.238));
  for (const [index, intensity] of [0.5, 1, 1.25, 1.5, 2].entries()) {
    const x = left + index * w(0.178);
    renderer.setColor([0.7, 0.82, 0.85]);
    renderer.setIntensity(0.8);
    drawText(renderer, intensity.toFixed(intensity === 1.25 ? 2 : 1), x, h(-0.325), {
      font: "segment16", height: w(0.023),
    });
    for (const [color, y] of [[cyan, h(-0.378)], [magenta, h(-0.432)]] as const) {
      renderer.setColor(color);
      renderer.setIntensity(intensity);
      renderer.moveTo(x, y);
      renderer.lineTo(x + w(0.085), y);
      renderer.point(x + w(0.111), y);
    }
  }
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
  const { width, height } = logicalSize(orientation);
  const left = -width * 0.43;
  const right = width * 0.07;
  const upper = height * 0.23;
  const lower = -height * 0.21;
  const labelSize = width * 0.026;
  const label = (text: string, x: number, y: number): void => {
    renderer.setColor(amber);
    renderer.setIntensity(0.75);
    drawText(renderer, text, x, y, { font: "segment16", height: labelSize });
    renderer.setColor(cyan);
    renderer.setIntensity(1);
  };

  renderer.beginFrame();
  label("STRAIGHT LINE", left, upper + height * 0.1);
  renderer.moveTo(left, upper);
  renderer.lineTo(left + width * 0.35, upper);

  label("CROSSING LINES", right, upper + height * 0.1);
  renderer.moveTo(right, upper - height * 0.055);
  renderer.lineTo(right + width * 0.35, upper + height * 0.055);
  renderer.moveTo(right, upper + height * 0.055);
  renderer.lineTo(right + width * 0.35, upper - height * 0.055);

  label("POINTS", left, lower + height * 0.13);
  for (const offset of [0.045, 0.125, 0.205, 0.285]) renderer.point(left + width * offset, lower);

  label("OVERDRIVE", right, lower + height * 0.13);
  for (const [intensity, y] of [[1, lower], [2, lower - height * 0.09]]) {
    label(intensity.toFixed(1), right, y - labelSize * 0.35);
    renderer.setIntensity(intensity);
    renderer.moveTo(right + width * 0.105, y);
    renderer.lineTo(right + width * 0.28, y);
    renderer.point(right + width * 0.33, y);
  }
  renderer.endFrame();
}

function stopAnimation(): void {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  animationFrame = undefined;
}

function animateGame(time: number): void {
  if (!animate || scene !== "game" || activeScreen !== "renderer" || document.hidden || contextStatus !== "ready") return;
  if (!drawingBufferSize(studyContext)) {
    renderRendererStatus();
    return;
  }
  drawGameScene((time * 0.03) % 360);
  updateTimingSample(time);
  animationFrame = requestAnimationFrame(animateGame);
}

function renderCurrentScene(): void {
  stopAnimation();
  writeValue("active-profile", profileSummary());
  if (contextStatus !== "ready" || !drawingBufferSize(studyContext)) {
    renderRendererStatus();
    return;
  }
  if (activeScreen !== "renderer" || document.hidden) return;
  renderer.setDisplayProfile(activeDisplayProfile());
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
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-canvas-orientation]")) {
    button.setAttribute("aria-pressed", String(button.dataset.canvasOrientation === canvasOrientation));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-content-orientation]")) {
    button.setAttribute("aria-pressed", String(button.dataset.contentOrientation === contentOrientation));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mapping]")) {
    button.setAttribute("aria-pressed", String(button.dataset.mapping === mappingMode));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-canvas-ratio]")) {
    button.setAttribute("aria-pressed", String(button.dataset.canvasRatio === canvasAspectPreset));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-content-ratio]")) {
    button.setAttribute("aria-pressed", String(button.dataset.contentRatio === contentAspectPreset));
  }
  canvasCustomAspect.hidden = canvasAspectPreset !== "custom";
  contentCustomAspect.hidden = contentAspectPreset !== "custom";
  requireElement(document.getElementById("calibration-capability-section"), "#calibration-capability-section").hidden = calibrationMode !== "omg1";
  widthControl.hidden = automaticSize;
  for (const button of sizeModeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.sizeMode === (automaticSize ? "auto" : "manual")));
  }
  const robotsSettings = automaticSize && calibrationMode === "omg1"
    && canvasOrientation === "landscape" && contentOrientation === "landscape"
    && canvasAspectPreset === "4:3" && contentAspectPreset === "4:3"
    && mappingMode === "letterbox" && backingScaleSelect.value === "robots";
  referenceStatus.textContent = robotsSettings ? "Robots settings active" : "Modified";
  const segmentStudy = scene === "segments" || scene === "spacing";
  requireElement(document.getElementById("segment-study-views"), "#segment-study-views").hidden = !segmentStudy;
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-scene]")) {
    button.setAttribute("aria-pressed", String(button.id === "segment-study-select" ? segmentStudy : button.dataset.scene === scene));
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-orientation]")) {
    button.setAttribute("aria-pressed", String(button.dataset.orientation === orientation));
  }
  workloadControls.hidden = scene !== "game";
  profileControls.hidden = scene !== "profile";
  studyStageLabel.textContent = studyNames[scene];
  writeValue("study-inspection", studyCues[scene]);
  profileCompare.setAttribute("aria-pressed", String(compareWithDefaults));
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
    resizeStudyCanvas();
    renderCurrentScene();
    scheduleMeasurements("study selection");
    return;
  }

  const selectedOrientation = target.dataset.orientation;
  if (selectedOrientation === "landscape" || selectedOrientation === "portrait") {
    if (orientation !== selectedOrientation) {
      orientation = selectedOrientation;
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
  renderCurrentScene();
});

workloadScale.addEventListener("change", () => {
  resizeStudyCanvas();
  resetTimingSample();
  renderCurrentScene();
  scheduleMeasurements("backing scale");
});

function activeDisplayProfile(): DisplayProfile {
  return scene === "profile" && compareWithDefaults ? DEFAULT_DISPLAY_PROFILE : profile;
}

function profileSummary(settings = activeDisplayProfile()): string {
  const defaults = settings.lineWidth === DEFAULT_DISPLAY_PROFILE.lineWidth
    && settings.pointRadius === DEFAULT_DISPLAY_PROFILE.pointRadius
    && settings.glowStrength === DEFAULT_DISPLAY_PROFILE.glowStrength
    && settings.glowSpread === DEFAULT_DISPLAY_PROFILE.glowSpread;
  return `${defaults ? "Defaults" : "Edited"} · beam ${settings.lineWidth.toFixed(1)} px · point ${settings.pointRadius.toFixed(1)} px · glow ${settings.glowStrength.toFixed(1)} · spread ${settings.glowSpread.toFixed(1)}`;
}

profileControls.addEventListener("input", (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const key = target.dataset.profile;
  if (key !== "lineWidth" && key !== "pointRadius" && key !== "glowStrength" && key !== "glowSpread") return;
  profile = { ...profile, [key]: target.valueAsNumber };
  compareWithDefaults = false;
  syncControls();
  renderCurrentScene();
});

profileCompare.addEventListener("click", () => {
  compareWithDefaults = !compareWithDefaults;
  syncControls();
  renderCurrentScene();
});

profileReset.addEventListener("click", () => {
  profile = { ...DEFAULT_DISPLAY_PROFILE };
  compareWithDefaults = false;
  syncControls();
  renderCurrentScene();
});

window.addEventListener("resize", () => {
  resizeStudyCanvas();
  if (activeScreen === "renderer") renderCurrentScene();
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
  if (activeScreen === "renderer") renderCurrentScene();
  renderCalibration();
  scheduleMeasurements("DPR change");
}
watchDevicePixelRatio();

document.addEventListener("visibilitychange", () => {
  resetTimingSample();
  if (document.hidden) {
    stopAnimation();
    clearGamepadState(true);
    deviceInput.clearKeyboard();
  }
  else if (activeScreen === "renderer") renderCurrentScene();
  scheduleMeasurements("visibility");
});

syncControls();
resizeStudyCanvas();
startRenderer(screen);
renderCalibration();
renderCurrentScene();
scheduleMeasurements("initial");

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-cal-mode]")) {
  button.addEventListener("click", () => {
    if (button.dataset.calMode !== "omg1" && button.dataset.calMode !== "generic") return;
    calibrationMode = button.dataset.calMode;
    setCalibrationError();
    syncControls();
    renderCalibration();
  });
}

function customCanvasDimensions(): CanvasSize | null {
  const width = boundedValue(canvasRatioWidthInput, "Canvas aspect width");
  if (width === null) return null;
  const height = boundedValue(canvasRatioHeightInput, "Canvas aspect height");
  if (height === null) return null;
  return { width, height };
}

function customContentDimensions(): CanvasSize | null {
  const width = boundedValue(virtualWidthInput, "Content width");
  if (width === null) return null;
  const height = boundedValue(virtualHeightInput, "Content height");
  if (height === null) return null;
  return { width, height };
}

function isAspectPreset(value: string | undefined): value is AspectPreset {
  return value === "custom" || ASPECT_PRESETS.some((preset) => preset === value);
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-canvas-orientation]")) {
  button.addEventListener("click", () => {
    const selected = button.dataset.canvasOrientation;
    if (selected !== "landscape" && selected !== "portrait") return;
    if (canvasOrientation === selected) return;
    canvasOrientation = selected;
    canvasCustomSize = swapDimensions(canvasCustomSize);
    canvasRatioWidthInput.value = String(canvasCustomSize.width);
    canvasRatioHeightInput.value = String(canvasCustomSize.height);
    refreshAspectSettings();
    setCalibrationError();
    syncControls();
    renderCalibration();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-content-orientation]")) {
  button.addEventListener("click", () => {
    const selected = button.dataset.contentOrientation;
    if (selected !== "landscape" && selected !== "portrait") return;
    if (contentOrientation === selected) return;
    contentOrientation = selected;
    contentCustomSize = swapDimensions(contentCustomSize);
    virtualWidthInput.value = String(contentCustomSize.width);
    virtualHeightInput.value = String(contentCustomSize.height);
    refreshAspectSettings();
    setCalibrationError();
    syncControls();
    renderCalibration();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-canvas-ratio]")) {
  button.addEventListener("click", () => {
    const value = button.dataset.canvasRatio;
    if (!isAspectPreset(value)) return;
    if (value === "custom") {
      const custom = customCanvasDimensions();
      if (!custom) return;
      canvasCustomSize = custom;
    }
    canvasAspectPreset = value;
    refreshAspectSettings();
    setCalibrationError();
    syncControls();
    renderCalibration();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-content-ratio]")) {
  button.addEventListener("click", () => {
    const value = button.dataset.contentRatio;
    if (!isAspectPreset(value)) return;
    if (value === "custom") {
      const custom = customContentDimensions();
      if (!custom) return;
      contentCustomSize = custom;
    }
    contentAspectPreset = value;
    refreshAspectSettings();
    setCalibrationError();
    syncControls();
    renderCalibration();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-mapping]")) {
  button.addEventListener("click", () => {
    if (button.dataset.mapping !== "letterbox" && button.dataset.mapping !== "stretch" && button.dataset.mapping !== "crop") return;
    mappingMode = button.dataset.mapping;
    syncControls();
    renderCalibration();
  });
}

function startManualSize(): void {
  if (automaticSize) {
    manualWidth = Math.max(64, Math.round(lastCssSize.width));
    widthInput.value = String(manualWidth);
  }
  automaticSize = false;
}

for (const button of sizeModeButtons) {
  button.addEventListener("click", () => {
    if (button.dataset.sizeMode === "auto") automaticSize = true;
    else startManualSize();
    setCalibrationError();
    syncControls();
    renderCalibration();
  });
}

widthInput.addEventListener("input", () => {
  const width = boundedValue(widthInput, "Canvas width");
  if (width === null) return;
  manualWidth = width;
  renderCalibration();
});

robotsReset.addEventListener("click", () => {
  calibrationMode = "omg1";
  canvasOrientation = "landscape";
  contentOrientation = "landscape";
  canvasAspectPreset = "4:3";
  contentAspectPreset = "4:3";
  canvasCustomSize = { width: 4, height: 3 };
  contentCustomSize = { width: 1024, height: 768 };
  canvasRatioWidthInput.value = "4";
  canvasRatioHeightInput.value = "3";
  virtualWidthInput.value = "1024";
  virtualHeightInput.value = "768";
  refreshAspectSettings();
  mappingMode = "letterbox";
  backingScaleSelect.value = "robots";
  automaticSize = true;
  setCalibrationError();
  syncControls();
  renderCalibration();
});

backingScaleSelect.addEventListener("change", () => {
  syncControls();
  renderCalibration();
});
for (const input of [canvasRatioWidthInput, canvasRatioHeightInput]) {
  input.addEventListener("input", () => {
    const custom = customCanvasDimensions();
    if (!custom) return;
    canvasCustomSize = custom;
    if (canvasAspectPreset === "custom") {
      refreshAspectSettings();
      syncControls();
      renderCalibration();
    }
  });
}

for (const input of [virtualWidthInput, virtualHeightInput]) {
  input.addEventListener("input", () => {
    const custom = customContentDimensions();
    if (!custom) return;
    contentCustomSize = custom;
    if (contentAspectPreset === "custom") {
      refreshAspectSettings();
      renderCalibration();
    }
  });
}

function changeManualWidthBy(width: number): void {
  manualWidth = Math.max(64, Math.min(4096, Math.round(width)));
  widthInput.value = String(manualWidth);
  renderCalibration();
}

resizeHandle.addEventListener("pointerdown", (event: PointerEvent) => {
  if (event.button !== 0) return;
  event.preventDefault();
  startManualSize();
  resizePointer = { id: event.pointerId, x: event.clientX, width: manualWidth };
  resizeHandle.setPointerCapture(event.pointerId);
  setCalibrationError();
  syncControls();
  renderCalibration();
});
resizeHandle.addEventListener("pointermove", (event: PointerEvent) => {
  if (!resizePointer || resizePointer.id !== event.pointerId) return;
  changeManualWidthBy(resizePointer.width + 2 * (event.clientX - resizePointer.x));
});
resizeHandle.addEventListener("lostpointercapture", (event: PointerEvent) => {
  if (resizePointer?.id === event.pointerId) resizePointer = null;
});
resizeHandle.addEventListener("keydown", (event: KeyboardEvent) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
  startManualSize();
  setCalibrationError();
  syncControls();
  changeManualWidthBy(manualWidth + direction * (event.shiftKey ? 10 : 1));
});

genericCanvas.addEventListener("contextlost", () => {
  genericBufferAvailable = false;
  scheduleMeasurements("Canvas 2D context lost");
});
genericCanvas.addEventListener("contextrestored", () => renderCalibration("Canvas 2D context restored"));
for (const id of ["calibration-capabilities", "webgl-capabilities"]) {
  document.getElementById(id)?.closest("details")?.addEventListener("toggle", renderCapabilities);
}

type NumericEdit = { input: HTMLInputElement; originalValue: string };
type SelectEdit = { select: HTMLSelectElement; originalValue: string };
let numericEdit: NumericEdit | null = null;
let selectEdit: SelectEdit | null = null;
let selectMenu: HTMLDivElement | null = null;
const deviceInput = new DiagnosticsDeviceInput();
let previousPadConnectionId: string | null = null;
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
  const details = focusedDetails ?? document.querySelector<HTMLDetailsElement>(".controls-help[open]")
    ?? [...document.querySelectorAll<HTMLDetailsElement>("details[open]")].filter((element) => !element.closest("[hidden]")).at(-1);
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
  deviceInput.resetGamepads();
  previousPadConnectionId = null;
  repeatedPadDirection = "";
  repeatedEditDirection = "";
  nextPadRepeatAt = 0;
  nextPadEditAt = 0;
  requirePadNeutral = requireNeutral;
  if (numericEdit) cancelNumericEdit();
  if (selectEdit) finishSelectEdit(false);
}

function pollGamepad(time: number): void {
  const { frame, gamepad: pad } = deviceInput.read(Array.from(navigator.getGamepads?.() ?? []));
  const gamepad = frame.gamepads[0] ?? null;
  if (!pad) {
    if (previousPadConnectionId !== null) clearGamepadState(false);
    if (gamepadStatus.textContent !== "Connect a standard-mapped gamepad to navigate.") {
      gamepadStatus.textContent = "Connect a standard-mapped gamepad to navigate.";
    }
    requestAnimationFrame(pollGamepad);
    return;
  }
  if (gamepad && previousPadConnectionId !== gamepad.connectionId) {
    previousPadConnectionId = gamepad.connectionId;
    requirePadNeutral = true;
    gamepadStatus.textContent = "Standard gamepad connected. Release held controls to begin.";
  }
  if (!document.hasFocus() || document.hidden) {
    clearGamepadState(true);
    deviceInput.clearKeyboard();
    requestAnimationFrame(pollGamepad);
    return;
  }

  const down = (index: number): boolean => gamepad?.buttonsDown.has(index) ?? false;
  if (requirePadNeutral) {
    if (isGamepadNeutral(pad)) requirePadNeutral = false;
    requestAnimationFrame(pollGamepad);
    return;
  }

  const buttonEdge = (index: number): boolean => gamepad?.buttonsPressed.has(index) ?? false;
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
  requestAnimationFrame(pollGamepad);
}

window.addEventListener("blur", () => {
  clearGamepadState(true);
  deviceInput.clearKeyboard();
});
window.addEventListener("focus", () => { requirePadNeutral = true; });
window.addEventListener("gamepaddisconnected", (event: GamepadEvent) => {
  deviceInput.gamepadDisconnected(event.gamepad.index);
  clearGamepadState(false);
});
window.addEventListener("gamepadconnected", (event: GamepadEvent) => {
  deviceInput.gamepadConnected(event.gamepad.index);
  gamepadStatus.textContent = "Gamepad connected; checking for standard mapping.";
});
document.addEventListener("keydown", (event: KeyboardEvent) => {
  deviceInput.keyDown(event.code || null, event.key, event.repeat);
  if (event.key !== "Escape") return;
  const keyboard = deviceInput.readCached().keyboard;
  if (!keyboard.pressed.some((entry) => entry.key === "Escape")) return;
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
document.addEventListener("keyup", (event: KeyboardEvent) => {
  deviceInput.keyUp(event.code || null, event.key);
});
fullscreenToggle.addEventListener("click", () => { fullscreenInitiator = fullscreenToggle; });
requestAnimationFrame(pollGamepad);

const calibrationObserver = new ResizeObserver(() => renderCalibration("stage resize"));
calibrationObserver.observe(calibrationViewport);
const studyObserver = new ResizeObserver(() => {
  if (rendererScreen.hidden) return;
  resizeStudyCanvas();
  renderCurrentScene();
  scheduleMeasurements("stage resize");
});
studyObserver.observe(studyStage);

function requireElement<T extends Element>(element: T | null, name: string): T {
  if (!element) throw new Error(`Missing ${name}`);
  return element;
}
