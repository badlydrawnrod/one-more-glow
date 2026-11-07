import type { DrawingContext } from "./graphics.ts";

/** A point in the logical coordinate space. */
export type Point = readonly [x: number, y: number];

/** Draw a connected, open path through the given points. */
export function drawPolyline(drawing: DrawingContext, points: readonly Point[]): void {
  if (points.length < 2) return;

  const [firstX, firstY] = points[0];
  drawing.moveTo(firstX, firstY);

  for (let index = 1; index < points.length; index += 1) {
    const [x, y] = points[index];
    drawing.lineTo(x, y);
  }
}

/** Draw a connected outline, closing the final point back to the first. */
export function drawPolygonOutline(drawing: DrawingContext, points: readonly Point[]): void {
  if (points.length < 3) return;

  drawPolyline(drawing, points);
  const [firstX, firstY] = points[0];
  drawing.lineTo(firstX, firstY);
}
