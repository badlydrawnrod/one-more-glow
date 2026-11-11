/** Exposed edges of the union of axis-aligned wall rectangles. */
export function wallOutline(rectangles: readonly { x: number; y: number; width: number; height: number }[]): [number, number, number, number][] {
  const xs = [...new Set(rectangles.flatMap((r) => [r.x, r.x + r.width]))].sort((a, b) => a - b);
  const ys = [...new Set(rectangles.flatMap((r) => [r.y, r.y + r.height]))].sort((a, b) => a - b);
  const filled = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < xs.length - 1 && y < ys.length - 1
    && rectangles.some((r) => xs[x] >= r.x && xs[x + 1] <= r.x + r.width && ys[y] >= r.y && ys[y + 1] <= r.y + r.height);
  const segments: [number, number, number, number][] = [];
  // Coalesce adjacent exposed edges into single lines.
  for (let y = 0; y < ys.length; y++) {
    let start: number | undefined;
    for (let x = 0; x < xs.length; x++) {
      const edge = x < xs.length - 1 && filled(x, y - 1) !== filled(x, y);
      if (edge && start === undefined) start = xs[x];
      if (!edge && start !== undefined) { segments.push([start, ys[y], xs[x], ys[y]]); start = undefined; }
    }
  }
  for (let x = 0; x < xs.length; x++) {
    let start: number | undefined;
    for (let y = 0; y < ys.length; y++) {
      const edge = y < ys.length - 1 && filled(x - 1, y) !== filled(x, y);
      if (edge && start === undefined) start = ys[y];
      if (!edge && start !== undefined) { segments.push([xs[x], start, xs[x], ys[y]]); start = undefined; }
    }
  }
  return segments;
}
