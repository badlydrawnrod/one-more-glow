import type { DrawingContext } from "one-more-glow";
import { drawDLKernedText, drawDLText } from "./dl3422-study.ts";

// The two candidate alphabets live only in this visual study. Segment endpoints
// are in a unit cell, with Y increasing upwards.
type Segment = readonly [number, number, number, number];
type Design = "16" | "22";

const shared: Record<string, Segment> = {
  a: [0, 1, 0.5, 1], b: [0.5, 1, 1, 1],
  c: [1, 1, 1, 0.5], d: [1, 0.5, 1, 0],
  e: [0.5, 0, 1, 0], f: [0, 0, 0.5, 0],
  g: [0, 0.5, 0, 0], h: [0, 1, 0, 0.5],
  i: [0, 0.5, 0.5, 0.5], j: [0.5, 0.5, 1, 0.5],
  k: [0, 1, 0.5, 0.5], l: [1, 1, 0.5, 0.5],
  m: [0.5, 0.5, 1, 0], n: [0.5, 0.5, 0, 0],
};
// Joining the top and bottom halves frees two strokes for a proper V while
// keeping this candidate to 16 selectable segments.
const segments16: Record<string, Segment> = {
  a: [0, 1, 1, 1], e: [0, 0, 1, 0],
  c: shared.c, d: shared.d, g: shared.g, h: shared.h,
  i: shared.i, j: shared.j, k: shared.k, l: shared.l, m: shared.m, n: shared.n,
  o: [0.5, 1, 0.5, 0.5], p: [0.5, 0.5, 0.5, 0],
  q: [0, 1, 0.5, 0], r: [1, 1, 0.5, 0],
};

// Base masks use split top and bottom strokes. These shapes are not a library font.
const baseGlyphs: Record<string, string> = {
  A: "abcdghij", B: "abcdefijop", C: "abefgh", D: "abcdefop",
  E: "abefghi", F: "abghi", G: "abdefghj", H: "cdghij",
  I: "abefop", J: "cdefg", K: "ghilm",
  L: "efgh", M: "cdghkl", N: "cdghkm", O: "abcdefgh",
  P: "abcghij", Q: "abcdefghm", R: "abcghijm", S: "abdefhij",
  T: "abop", U: "cdefgh", V: "", W: "cdghmn",
  X: "klmn", Y: "klp", Z: "abefln",
  "0": "abcdefghln", "1": "cd", "2": "abcefgij", "3": "abcdefij",
  "4": "cdhij", "5": "abdefhij", "6": "abdefghij", "7": "abcd",
  "8": "abcdefghij", "9": "abcdefhij", "-": "ij", " ": "",
};
// Map split horizontal strokes to the joined 16-segment strokes, once each.
const glyphs16: Record<string, string> = Object.fromEntries(
  Object.entries(baseGlyphs).map(([character, mask]) => [
    character,
    [...new Set([...mask].map((name) => name === "b" ? "a" : name === "f" ? "e" : name))].join(""),
  ]),
);
glyphs16.V = "qr";

function drawText(
  drawing: DrawingContext,
  text: string,
  x: number,
  baseline: number,
  height: number,
  design: Design,
): void {
  if (design !== "16") {
    drawDLText(drawing, text, x, baseline, height);
    return;
  }
  const width = height * 0.58;
  const advance = height * 0.82;
  for (const character of text) {
    for (const name of glyphs16[character] ?? "") {
      const [x1, y1, x2, y2] = segments16[name];
      drawing.moveTo(x + x1 * width, baseline + y1 * height);
      drawing.lineTo(x + x2 * width, baseline + y2 * height);
    }
    x += advance;
  }
}

/** Compare the proposed cells using the same samples and drawing style. */
export function drawSegmentStudy(drawing: DrawingContext, portrait: boolean): void {
  const top = portrait ? 465 : 330;
  const large = portrait ? 37 : 32;
  const left = -16 * large * 0.82 / 2;
  const row = portrait ? 65 : 49;

  drawing.beginFrame();
  drawing.setColor([1, 0.55, 0.12]);
  drawing.setIntensity(0.8);
  drawText(drawing, "16 SEGMENT", left, top - 20, 19, "16");
  drawing.setColor([0, 0.9, 1]);
  drawing.setIntensity(0.9);
  drawText(drawing, "ABCDEFGHIJKLM", left, top - row - large, large, "16");
  drawText(drawing, "NOPQRSTUVWXYZ", left, top - row * 2 - large, large, "16");
  drawText(drawing, "0123456789", left, top - row * 3 - large, large, "16");
  drawing.setIntensity(0.7);
  drawText(drawing, "SCORE 001250  WAVE 03", left, top - row * 4 - 20, 20, "16");

  drawing.setColor([1, 0.55, 0.12]);
  drawing.setIntensity(0.8);
  drawText(drawing, "22 SEGMENT", left, top - row * 5 - 18, 18, "22");
  drawing.setColor([0, 0.9, 1]);
  drawing.setIntensity(0.9);
  // Six rows of the reference chart: ASCII 0x20 through 0x7e, followed by
  // the blank 0x7f cell. Preserve the space at the start of the first row.
  for (let line = 0; line < 6; line += 1) {
    const text = Array.from({ length: 16 }, (_, column) =>
      String.fromCharCode(0x20 + line * 16 + column)).join("");
    drawText(drawing, text, left, top - row * (6 + line) - large, large, "22");
  }
  drawing.setIntensity(0.7);
  drawText(drawing, "Score 001250  Wave 03", left, top - row * 12 - 20, 20, "22");
  drawDLKernedText(drawing, "The quick brown fox jumps over the lazy dog.", 0, top - row * 13 - 24, 24);
  drawing.endFrame();
}
