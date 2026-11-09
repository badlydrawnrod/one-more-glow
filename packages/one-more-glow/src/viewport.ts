import type { DisplayOrientation } from "./graphics.ts";

export interface Viewport {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  /** Number of backing-store pixels per CSS pixel. */
  readonly pixelScale: number;
  mapPoint(x: number, y: number): readonly [number, number];
}

export function createViewport(
  width: number,
  height: number,
  cssWidth: number,
  cssHeight: number,
  orientation: DisplayOrientation,
): Viewport {
  const logicalWidth = orientation === "landscape" ? 1024 : 768;
  const logicalHeight = orientation === "landscape" ? 768 : 1024;
  const scale = Math.min(width / logicalWidth, height / logicalHeight);
  const offsetX = (width - logicalWidth * scale) / 2;
  const offsetY = (height - logicalHeight * scale) / 2;
  const horizontalPixelScale = cssWidth > 0 ? width / cssWidth : 1;
  const verticalPixelScale = cssHeight > 0 ? height / cssHeight : horizontalPixelScale;
  const pixelScale = Math.sqrt(horizontalPixelScale * verticalPixelScale);

  return {
    scale,
    offsetX,
    offsetY,
    pixelScale,
    mapPoint(x, y) {
      return [
        offsetX + (x + logicalWidth / 2) * scale,
        offsetY + (logicalHeight / 2 - y) * scale,
      ];
    },
  };
}
