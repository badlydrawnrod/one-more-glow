import assert from "node:assert/strict";
import test from "node:test";
import { drawText, measureText, type DrawingContext, type TextOptions } from "../src/index.ts";

type Operation = ["line" | "point", number, number, number?, number?];

function recordingDrawing() {
  const operations: Operation[] = [];
  let pen = [0, 0];
  let transform = (x: number, y: number) => [x, y];
  const drawing: DrawingContext = {
    beginFrame() { throw new Error("unexpected state change"); },
    endFrame() { throw new Error("unexpected state change"); },
    setColor() { throw new Error("unexpected state change"); },
    setIntensity() { throw new Error("unexpected state change"); },
    pushTransform() { throw new Error("unexpected state change"); },
    popTransform() { throw new Error("unexpected state change"); },
    translate() { throw new Error("unexpected state change"); },
    rotate() { throw new Error("unexpected state change"); },
    scale() { throw new Error("unexpected state change"); },
    moveTo(x, y) { pen = transform(x, y); },
    lineTo(x, y) {
      const next = transform(x, y);
      operations.push(["line", pen[0], pen[1], next[0], next[1]]);
      pen = next;
    },
    point(x, y) { const p = transform(x, y); operations.push(["point", p[0], p[1]]); },
  };
  return { drawing, operations, get pen() { return pen; }, setTransform: (fn: typeof transform) => { transform = fn; } };
}

const fonts = ["segment16", "segment22"] as const;
const opts = (font: TextOptions["font"], spacing?: TextOptions["spacing"]): TextOptions => ({ font, height: 100, spacing });
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

function image(text: string, options: TextOptions) {
  const result = recordingDrawing();
  drawText(result.drawing, text, 0, 0, options);
  return result.operations;
}

test("supported glyphs draw, lowercase 16 maps to uppercase, and spaces remain blank", () => {
  for (const font of fonts) {
    const characters = font === "segment16" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!?+-/" :
      Array.from({ length: 94 }, (_, index) => String.fromCharCode(index + 33)).join("");
    for (const char of characters) assert.ok(image(char, opts(font)).length > 0, `${font}: ${char}`);
    assert.deepEqual(image(" ", opts(font)), []);
  }
  for (const char of "abcdefghijklmnopqrstuvwxyz") {
    assert.deepEqual(image(char, opts("segment16")), image(char.toUpperCase(), opts("segment16")));
  }
  assert.notDeepEqual(image("a", opts("segment22")), image("A", opts("segment22")));
});

test("unsupported code points use a visible question mark, including astral characters and controls", () => {
  for (const font of fonts) for (const spacing of ["fixed", "kerned"] as const) {
    const options = opts(font, spacing);
    assert.deepEqual(image("😀\né", options), image("???", options));
    near(measureText("😀\né", options).width, measureText("???", options).width);
  }
});

test("metrics describe font-wide dimensions and advances, including empty and trailing spaces", () => {
  for (const font of fonts) {
    const options = opts(font);
    const metrics = measureText("A ", options);
    near(metrics.width, 164);
    assert.equal(metrics.ascent, 100);
    assert.equal(metrics.descent, font === "segment16" ? 25 : 35);
    assert.equal(measureText("", options).width, 0);
    near(measureText(" ", options).width, 82);
    near(measureText("   ", opts(font, "kerned")).width, 120);
    near(measureText("0123456789", opts(font, "kerned")).width, 820);
  }
});

test("kerned digits keep fixed advances while letters retain proportional spacing and kerning", () => {
  for (const font of fonts) {
    const options = opts(font, "kerned");
    near(measureText("111", options).width, 246);
    near(measureText("888", options).width, 246);
  }
  for (const [font, pair] of [["segment16", "AV"], ["segment22", "Th"]] as const) {
    const options = opts(font, "kerned");
    assert.ok(measureText(pair, options).width <
      measureText(pair[0], options).width + measureText(pair[1], options).width);
  }
});

test("kerned digit strokes are centred in their equal-width advances", () => {
  for (const font of fonts) {
    const options = opts(font, "kerned");
    for (const digit of "0123456789") {
      const xs = image(digit, options).flatMap((op) => op[0] === "line" ? [op[1], op[3]!] : [op[1]]);
      near((Math.min(...xs) + Math.max(...xs)) / 2, measureText(digit, options).width / 2);
    }
  }
});

test("kerned HUD labels retain space between letters, punctuation and words", () => {
  for (const font of fonts) {
    const options = opts(font, "kerned");
    // H and S span the whole cell; the advance includes a readable gap.
    near(measureText("HH", options).width, 160);
    near(measureText("SHIPS 03", options).width,
      measureText("SHIPS", options).width + measureText(" ", options).width + measureText("03", options).width);
    assert.ok(measureText("H:H", options).width > measureText("HH", options).width);
  }
});

test("22-segment colon has aligned dots inside the uppercase height in both spacing modes", () => {
  for (const spacing of ["fixed", "kerned"] as const) {
    const points = image(":", opts("segment22", spacing));
    assert.equal(points.length, 2);
    assert.equal(points[0][0], "point");
    assert.equal(points[1][0], "point");
    near(points[0][1], points[1][1]);
    assert.ok(points.every((point) => point[2] > 0 && point[2] < 100));
    assert.ok(Math.abs(points[0][2] - points[1][2]) > 20);
  }
});

test("font-wide ascent and descent contain every supported glyph", () => {
  for (const font of fonts) {
    const options = opts(font);
    const text = font === "segment16" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!?+-/" :
      Array.from({ length: 94 }, (_, index) => String.fromCharCode(index + 33)).join("");
    const metrics = measureText(text, options);
    for (const op of image(text, options)) {
      for (const y of op[0] === "line" ? [op[2], op[4]!] : [op[2]]) {
        assert.ok(y >= -metrics.descent && y <= metrics.ascent, `${font}: ${y}`);
      }
    }
  }
});

test("kerning applies within a call, and draw leaves the pen at the measured next position", () => {
  for (const font of fonts) {
    const options = opts(font, "kerned");
    const text = font === "segment16" ? "AV" : "Th";
    const combined = measureText(text, options).width;
    assert.ok(combined < measureText(text[0], options).width + measureText(text[1], options).width);
    const result = recordingDrawing();
    drawText(result.drawing, text[0], 0, 0, options);
    drawText(result.drawing, text[1], result.pen[0], 0, options);
    near(result.pen[0], measureText(text[0], options).width + measureText(text[1], options).width);
    drawText(result.drawing, text + " ", 12, -7, options);
    near(result.pen[0], 12 + measureText(text + " ", options).width);
    near(result.pen[1], -7);
    result.drawing.lineTo(10, 20);
    const line = result.operations.at(-1)!;
    near(line[1], 12 + measureText(text + " ", options).width);
    near(line[2], -7);
    drawText(result.drawing, "", 4, 5, options);
    assert.deepEqual(result.pen, [4, 5]);
  }
});

test("geometry and final pen follow the active transform", () => {
  const original = recordingDrawing();
  const transformed = recordingDrawing();
  transformed.setTransform((x, y) => [2 * x + 9, -3 * y + 4]);
  const options = opts("segment22", "kerned");
  drawText(original.drawing, "g!", 3, 7, options);
  drawText(transformed.drawing, "g!", 3, 7, options);
  assert.equal(original.operations.length, transformed.operations.length);
  original.operations.forEach((op, i) => {
    const actual = transformed.operations[i];
    assert.equal(actual[0], op[0]);
    near(actual[1], 2 * op[1] + 9); near(actual[2], -3 * op[2] + 4);
    if (op[0] === "line") { near(actual[3]!, 2 * op[3]! + 9); near(actual[4]!, -3 * op[4]! + 4); }
  });
  near(transformed.pen[0], 2 * (3 + measureText("g!", options).width) + 9);
  near(transformed.pen[1], -17);
});

test("invalid height or position is a no-op without changing the pen", () => {
  for (const height of [0, -1, NaN, Infinity, -Infinity]) {
    const options = { font: "segment16", height } as const;
    assert.deepEqual(measureText("A", options), { width: 0, ascent: 0, descent: 0 });
    const result = recordingDrawing();
    result.drawing.moveTo(8, 9);
    drawText(result.drawing, "A", 1, 2, options);
    assert.deepEqual(result.operations, []); assert.deepEqual(result.pen, [8, 9]);
  }
  for (const [x, y] of [[NaN, 0], [0, Infinity], [-Infinity, 2]]) {
    const result = recordingDrawing();
    result.drawing.moveTo(8, 9);
    drawText(result.drawing, "A", x, y, opts("segment22"));
    assert.deepEqual(result.operations, []); assert.deepEqual(result.pen, [8, 9]);
  }
});
