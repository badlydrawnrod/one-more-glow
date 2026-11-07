/** RGB components are normalized to the range 0–1. */
export type Color = readonly [red: number, green: number, blue: number];

/** Immediate-mode drawing operations shared by display renderers. */
export interface DrawingContext {
  beginFrame(): void;
  endFrame(): void;
  setColor(color: Color): void;
  setIntensity(value: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  point(x: number, y: number): void;
}
