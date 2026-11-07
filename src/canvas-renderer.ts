import type { Color, DrawingContext, RendererOptions } from "./graphics.ts";
import { createViewport, type Viewport } from "./viewport.ts";

function unit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function cssColor([red, green, blue]: Color): string {
  const channel = (value: number) => Math.round(unit(value) * 255);
  return `rgb(${channel(red)} ${channel(green)} ${channel(blue)})`;
}

function brightCoreColor([red, green, blue]: Color, intensity: number): Color {
  const saturation = 0.2 + 0.65 * intensity;
  const brighten = (value: number) => {
    const normalized = unit(value);
    return normalized + (1 - normalized) * saturation;
  };
  return [brighten(red), brighten(green), brighten(blue)];
}

const haloBlur = 24;
const haloPadding = 36;
const haloPasses = 3;

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create Canvas 2D halo surface");
  return context;
}

/** Create the Canvas 2D implementation of the renderer-independent API. */
export function createCanvasRenderer(
  context: CanvasRenderingContext2D,
  options: RendererOptions = {},
): DrawingContext {
  const haloCanvas = context.canvas.ownerDocument.createElement("canvas");
  const haloContext = requireContext(haloCanvas);

  let color: Color = [1, 1, 1];
  let intensity = 1;
  let position: readonly [number, number] | undefined;
  let haloWidth = 0;
  let haloHeight = 0;
  let haloPixelScale = 0;

  context.lineCap = "round";

  function viewport(): Viewport {
    const canvas = context.canvas;
    return createViewport(
      canvas.width,
      canvas.height,
      canvas.clientWidth,
      canvas.clientHeight,
      options.orientation ?? "landscape",
    );
  }

  function applyStyle(): void {
    context.strokeStyle = cssColor(color);
    context.fillStyle = cssColor(color);
    context.globalAlpha = intensity;
    context.shadowColor = cssColor(color);
  }

  function syncHaloSize(pixelScale: number): void {
    if (haloWidth !== context.canvas.width) {
      haloCanvas.width = context.canvas.width;
      haloWidth = context.canvas.width;
    }
    if (haloHeight !== context.canvas.height) {
      haloCanvas.height = context.canvas.height;
      haloHeight = context.canvas.height;
    }
    if (haloPixelScale !== pixelScale) {
      haloPixelScale = pixelScale;
      haloContext.lineWidth = 1.5 * pixelScale;
      haloContext.shadowBlur = haloBlur * pixelScale;
    }
    haloContext.lineCap = "round";
  }

  function regionFor(
    pixelScale: number,
    ...points: readonly [number, number][]
  ): [number, number, number, number] {
    const padding = haloPadding * pixelScale;
    const left = Math.max(0, Math.floor(Math.min(...points.map(([x]) => x)) - padding));
    const top = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y)) - padding));
    const right = Math.min(
      haloWidth,
      Math.ceil(Math.max(...points.map(([x]) => x)) + padding),
    );
    const bottom = Math.min(
      haloHeight,
      Math.ceil(Math.max(...points.map(([, y]) => y)) + padding),
    );
    return [left, top, Math.max(0, right - left), Math.max(0, bottom - top)];
  }

  function drawHaloLine(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    pixelScale: number,
  ): void {
    const [left, top, width, height] = regionFor(
      pixelScale,
      [startX, startY], [endX, endY],
    );
    if (width === 0 || height === 0) return;
    haloContext.clearRect(left, top, width, height);
    haloContext.beginPath();
    haloContext.moveTo(startX, startY);
    haloContext.lineTo(endX, endY);
    haloContext.lineWidth = 1.5 * pixelScale;
    haloContext.strokeStyle = cssColor(color);
    haloContext.shadowColor = cssColor(color);
    haloContext.shadowBlur = haloBlur * pixelScale;
    haloContext.globalAlpha = 1;
    haloContext.globalCompositeOperation = "lighter";
    for (let pass = 0; pass < haloPasses; pass++) haloContext.stroke();
    haloContext.globalCompositeOperation = "destination-out";
    haloContext.shadowBlur = 0;
    haloContext.shadowColor = "rgba(0, 0, 0, 0)";
    haloContext.stroke();

    context.globalAlpha = intensity;
    context.drawImage(haloCanvas, left, top, width, height, left, top, width, height);
  }

  function drawHaloPoint(x: number, y: number, pixelScale: number): void {
    const [left, top, width, height] = regionFor(pixelScale, [x, y]);
    if (width === 0 || height === 0) return;
    haloContext.clearRect(left, top, width, height);
    haloContext.beginPath();
    haloContext.arc(x, y, 1.5 * pixelScale, 0, Math.PI * 2);
    haloContext.fillStyle = cssColor(color);
    haloContext.shadowColor = cssColor(color);
    haloContext.shadowBlur = haloBlur * pixelScale;
    haloContext.globalAlpha = 1;
    haloContext.globalCompositeOperation = "lighter";
    for (let pass = 0; pass < haloPasses; pass++) haloContext.fill();
    haloContext.globalCompositeOperation = "destination-out";
    haloContext.shadowBlur = 0;
    haloContext.shadowColor = "rgba(0, 0, 0, 0)";
    haloContext.fill();

    context.globalAlpha = intensity;
    context.drawImage(haloCanvas, left, top, width, height, left, top, width, height);
  }

  syncHaloSize(viewport().pixelScale);
  applyStyle();

  return {
    beginFrame() {
      const currentViewport = viewport();
      syncHaloSize(currentViewport.pixelScale);
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      position = undefined;
    },
    endFrame() {},
    setColor(nextColor) {
      color = nextColor;
      applyStyle();
    },
    setIntensity(value) {
      intensity = unit(value);
      applyStyle();
    },
    moveTo(x, y) {
      const [outputX, outputY] = viewport().mapPoint(x, y);
      context.beginPath();
      context.moveTo(outputX, outputY);
      position = [x, y];
    },
    lineTo(x, y) {
      if (!position) return;
      const currentViewport = viewport();
      syncHaloSize(currentViewport.pixelScale);
      const [startX, startY] = currentViewport.mapPoint(position[0], position[1]);
      const [endX, endY] = currentViewport.mapPoint(x, y);
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      drawHaloLine(startX, startY, endX, endY, currentViewport.pixelScale);
      context.globalAlpha = intensity;
      context.shadowBlur = 0;
      context.lineWidth = 1.5 * currentViewport.pixelScale;
      context.lineCap = "round";
      context.strokeStyle = cssColor(color);
      context.stroke();
      context.strokeStyle = cssColor(brightCoreColor(color, intensity));
      context.stroke();
      context.beginPath();
      context.moveTo(endX, endY);
      position = [x, y];
    },
    point(x, y) {
      applyStyle();
      const currentViewport = viewport();
      syncHaloSize(currentViewport.pixelScale);
      const [outputX, outputY] = currentViewport.mapPoint(x, y);
      drawHaloPoint(outputX, outputY, currentViewport.pixelScale);
      context.globalAlpha = intensity;
      context.shadowBlur = 0;
      context.beginPath();
      context.arc(outputX, outputY, 1.5 * currentViewport.pixelScale, 0, Math.PI * 2);
      context.fillStyle = cssColor(color);
      context.fill();
      context.fillStyle = cssColor(brightCoreColor(color, intensity));
      context.fill();
    },
  };
}
