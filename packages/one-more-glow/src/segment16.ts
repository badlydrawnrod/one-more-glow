type Segment = readonly [number, number, number, number];
type Element = readonly [number, number] | Segment;

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
export const segments16: Record<string, Element> = {
  a: [0, 1, 1, 1], e: [0, 0, 1, 0],
  c: shared.c, d: shared.d, g: shared.g, h: shared.h,
  i: shared.i, j: shared.j, k: shared.k, l: shared.l, m: shared.m, n: shared.n,
  o: [0.5, 1, 0.5, 0.5], p: [0.5, 0.5, 0.5, 0],
  q: [0, 1, 0.5, 0], r: [1, 1, 0.5, 0],
  s: [0.5, 0], t: [0.5, 0.65], u: [0.5, 0, 0.35, -0.25],
  v: [0.5, 1, 0.5, 0.2],
};

// Base masks use split top and bottom strokes.
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
export const glyphs16: Record<string, string> = Object.fromEntries(
  Object.entries(baseGlyphs).map(([character, mask]) => [
    character,
    [...new Set([...mask].map((name) => name === "b" ? "a" : name === "f" ? "e" : name))].join(""),
  ]),
);
glyphs16.V = "qr";
Object.assign(glyphs16, {
  ".": "s", ",": "su", ":": "st", "!": "vs",
  "?": "acijps", "+": "ijop", "/": "ln",
});

