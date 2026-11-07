import type { DrawingContext } from "./graphics.ts";

/** A point in the logical coordinate space. */
export type Point = readonly [x: number, y: number];

const MAX_CHORD_ERROR = 0.5;
const MIN_CURVE_SEGMENTS = 12;

function curveSegmentCount(maxRadius: number): number {
  if (maxRadius <= MAX_CHORD_ERROR / 2) return MIN_CURVE_SEGMENTS;
  const segments = Math.ceil(Math.PI / Math.acos(1 - MAX_CHORD_ERROR / maxRadius));
  return Math.max(MIN_CURVE_SEGMENTS, segments);
}

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

/** Draw a circle as a closed, line-segment outline. */
export function drawCircle(drawing: DrawingContext, center: Point, radius: number): void {
  if (radius <= 0) return;

  drawEllipse(drawing, center, radius, radius);
}

/** Draw an ellipse as a closed, line-segment outline. */
export function drawEllipse(
  drawing: DrawingContext,
  center: Point,
  radiusX: number,
  radiusY: number,
): void {
  if (radiusX <= 0 || radiusY <= 0) return;

  const segments = curveSegmentCount(Math.max(radiusX, radiusY));
  const points: Point[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index * 2 * Math.PI) / segments;
    points.push([
      center[0] + Math.cos(angle) * radiusX,
      center[1] + Math.sin(angle) * radiusY,
    ]);
  }

  drawPolygonOutline(drawing, points);
}
