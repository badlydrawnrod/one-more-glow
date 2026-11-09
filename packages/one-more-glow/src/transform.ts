type Matrix = readonly [number, number, number, number, number, number];
type Point = readonly [number, number];

const identity: Matrix = [1, 0, 0, 1, 0, 0];

/** The small affine transform stack shared by the drawing backends. */
export function createTransformStack() {
  let current = identity;
  const saved: Matrix[] = [];

  function multiply(right: Matrix): void {
    const [a, b, c, d, e, f] = current;
    const [g, h, i, j, k, l] = right;
    current = [
      a * g + c * h,
      b * g + d * h,
      a * i + c * j,
      b * i + d * j,
      a * k + c * l + e,
      b * k + d * l + f,
    ];
  }

  return {
    push(): void {
      saved.push(current);
    },
    pop(): void {
      current = saved.pop() ?? current;
    },
    reset(): void {
      current = identity;
      saved.length = 0;
    },
    translate(x: number, y: number): void {
      multiply([1, 0, 0, 1, x, y]);
    },
    rotate(angleDegrees: number): void {
      const angle = angleDegrees * Math.PI / 180;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      multiply([cosine, sine, -sine, cosine, 0, 0]);
    },
    scale(x: number, y: number): void {
      multiply([x, 0, 0, y, 0, 0]);
    },
    apply(x: number, y: number): Point {
      const [a, b, c, d, e, f] = current;
      return [a * x + c * y + e, b * x + d * y + f];
    },
  };
}
