import type { Color, DrawingContext } from "./graphics.ts";

function unit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function cssColor([red, green, blue]: Color): string {
  const channel = (value: number) => Math.round(unit(value) * 255);
  return `rgb(${channel(red)} ${channel(green)} ${channel(blue)})`;
}

/** Create the Canvas 2D implementation of the renderer-independent API. */
export function createCanvasRenderer(
  context: CanvasRenderingContext2D,
): DrawingContext {
  let color: Color = [1, 1, 1];
  let intensity = 1;
  let hasPosition = false;

  context.lineWidth = 1.5;
  context.lineCap = "round";

  function applyStyle(): void {
    context.strokeStyle = cssColor(color);
    context.fillStyle = cssColor(color);
    context.globalAlpha = intensity;
  }

  return {
    beginFrame() {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
      hasPosition = false;
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
      context.beginPath();
      context.moveTo(x, y);
      hasPosition = true;
    },
    lineTo(x, y) {
      if (!hasPosition) return;
      context.lineTo(x, y);
      context.stroke();
      context.beginPath();
      context.moveTo(x, y);
    },
    point(x, y) {
      applyStyle();
      context.beginPath();
      context.arc(x, y, 1.5, 0, Math.PI * 2);
      context.fill();
    },
  };
}
