import type { Color, DrawingContext } from "one-more-glow";

export interface ClipBounds {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

/** Returns the shared area of two clip rectangles, or undefined when disjoint. */
export function intersectClipBounds(first: ClipBounds, second: ClipBounds): ClipBounds | undefined {
  const intersection = {
    left: Math.max(first.left, second.left),
    right: Math.min(first.right, second.right),
    bottom: Math.max(first.bottom, second.bottom),
    top: Math.min(first.top, second.top),
  };
  if (intersection.left > intersection.right || intersection.bottom > intersection.top) return undefined;
  return intersection;
}

type Transform = { a: number; b: number; c: number; d: number; e: number; f: number };
type Point = { x: number; y: number };

/**
 * Applies transforms to local points, then clips in the resulting coordinate
 * space before forwarding geometry to `target`. Thus `bounds` are expressed
 * in the coordinates this wrapper passes to its immediate target, not in the
 * wrapper's untransformed local coordinates. For nested wrappers, those are
 * the inner wrapper's output coordinates; the target applies its own
 * transforms afterward.
 */
export function clippedDrawing(target: DrawingContext, bounds: ClipBounds): DrawingContext {
  let transform: Transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const stack: Transform[] = [];
  let current: Point | undefined;

  const map = (x: number, y: number): Point => ({
    x: transform.a * x + transform.c * y + transform.e,
    y: transform.b * x + transform.d * y + transform.f,
  });

  const inside = ({ x, y }: Point): boolean => x >= bounds.left && x <= bounds.right
    && y >= bounds.bottom && y <= bounds.top;

  const clippedSegment = (start: Point, end: Point): [Point, Point] | undefined => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    let low = 0;
    let high = 1;
    const tests: [number, number][] = [
      [-dx, start.x - bounds.left], [dx, bounds.right - start.x],
      [-dy, start.y - bounds.bottom], [dy, bounds.top - start.y],
    ];
    for (const [p, q] of tests) {
      if (p === 0) {
        if (q < 0) return undefined;
        continue;
      }
      const t = q / p;
      if (p < 0) low = Math.max(low, t);
      else high = Math.min(high, t);
      if (low > high) return undefined;
    }
    return [
      { x: start.x + low * dx, y: start.y + low * dy },
      { x: start.x + high * dx, y: start.y + high * dy },
    ];
  };

  return {
    beginFrame: () => target.beginFrame(),
    endFrame: () => target.endFrame(),
    setColor: (color: Color) => target.setColor(color),
    setIntensity: (value: number) => target.setIntensity(value),
    pushTransform() { stack.push({ ...transform }); },
    popTransform() {
      const previous = stack.pop();
      if (!previous) throw new Error("Cannot pop an empty transform stack");
      transform = previous;
    },
    translate(x: number, y: number) {
      transform = { ...transform, e: transform.a * x + transform.c * y + transform.e,
        f: transform.b * x + transform.d * y + transform.f };
    },
    rotate(angleDegrees: number) {
      const angle = angleDegrees * Math.PI / 180;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const { a, b, c, d, e, f } = transform;
      transform = { a: a * cosine + c * sine, b: b * cosine + d * sine,
        c: -a * sine + c * cosine, d: -b * sine + d * cosine, e, f };
    },
    scale(x: number, y: number) {
      transform = { ...transform, a: transform.a * x, b: transform.b * x,
        c: transform.c * y, d: transform.d * y };
    },
    moveTo(x: number, y: number) { current = map(x, y); },
    lineTo(x: number, y: number) {
      const end = map(x, y);
      if (current) {
        const segment = clippedSegment(current, end);
        if (segment) {
          target.moveTo(segment[0].x, segment[0].y);
          target.lineTo(segment[1].x, segment[1].y);
        }
      }
      current = end;
    },
    point(x: number, y: number) {
      const point = map(x, y);
      if (inside(point)) target.point(point.x, point.y);
    },
  };
}
