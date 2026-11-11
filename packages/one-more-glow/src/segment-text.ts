import type { DrawingContext } from "./graphics.ts";
import { glyphs16, segments16 } from "./segment16.ts";
import { elements22, masks22, overrides22, type Element } from "./segment22.ts";

/** Segment font, uppercase height in logical units, and optional spacing mode. */
export interface TextOptions {
  font: "segment16" | "segment22";
  height: number;
  spacing?: "fixed" | "kerned";
}

/** Advance and font-wide vertical distances in local logical units. */
export interface TextMetrics {
  width: number;
  ascent: number;
  descent: number;
}

type Glyph = { elements: readonly Element[]; left: number; right: number };

function makeGlyph(elements: readonly Element[]): Glyph {
  let left = Infinity;
  let right = -Infinity;
  for (const element of elements) {
    left = Math.min(left, element[0]);
    right = Math.max(right, element[0]);
    if (element.length === 4) {
      left = Math.min(left, element[2]);
      right = Math.max(right, element[2]);
    }
  }
  return { elements, left, right };
}

const font16 = new Map(Object.entries(glyphs16).map(([character, mask]) =>
  [character, makeGlyph([...mask].map((name) => segments16[name]))]));
const font22 = new Map(masks22.map((mask, index) =>
  [String.fromCharCode(index + 32), makeGlyph(overrides22[String.fromCharCode(index + 32)]
    ?? [...mask].map((name) => elements22[name.charCodeAt(0) - 97]))]));
const pairs16: Readonly<Record<string, number>> = { AV: -0.05, VA: -0.05, TA: -0.04 };
const pairs22: Readonly<Record<string, number>> = { Th: -0.05, fo: -0.04, ov: -0.03 };

function validHeight(height: number): boolean {
  return Number.isFinite(height) && height > 0;
}

// Shared by drawing and measurement, including substitution and pair spacing.
function layout(
  text: string,
  options: TextOptions,
  visit?: (glyph: Glyph, x: number) => void,
): number {
  const { font, height } = options;
  const glyphs = font === "segment16" ? font16 : font22;
  const pairs = font === "segment16" ? pairs16 : pairs22;
  const kerned = options.spacing === "kerned";
  let advance = 0;
  let previous = "";

  for (const codePoint of text) {
    const code = codePoint.codePointAt(0)!;
    const character = font === "segment16" && code >= 97 && code <= 122
      ? String.fromCharCode(code - 32) : codePoint;
    const supported = glyphs.has(character) ? character : "?";
    const glyph = glyphs.get(supported)!;
    if (kerned && supported === " ") {
      advance += 0.40 * height;
      previous = "";
      continue;
    }
    const digit = supported >= "0" && supported <= "9";
    const previousDigit = previous >= "0" && previous <= "9";
    if (kerned && !digit && !previousDigit) advance += (pairs[previous + supported] ?? 0) * height;
    const inkWidth = (glyph.right - glyph.left) * 0.58;
    const punctuationBearing = kerned && font === "segment22" && supported === ":" ? 0.06 : 0;
    const offset = kerned
      ? ((digit ? (0.82 - inkWidth) / 2 : punctuationBearing) - glyph.left * 0.58) * height
      : 0;
    if (glyph.elements.length) visit?.(glyph, advance + offset);
    advance += kerned && !digit ? (inkWidth + 0.22 + 2 * punctuationBearing) * height : 0.82 * height;
    previous = supported;
  }
  return advance;
}

/** Measure the next-character advance and font-wide ascent and descent. */
export function measureText(text: string, options: TextOptions): TextMetrics {
  if (!validHeight(options.height)) return { width: 0, ascent: 0, descent: 0 };
  return {
    width: layout(text, options),
    ascent: options.height,
    descent: options.height * (options.font === "segment16" ? 0.25 : 0.35),
  };
}

/** Draw one line using the current drawing state, leaving the pen at its advance. */
export function drawText(drawing: DrawingContext, text: string, x: number, y: number, options: TextOptions): void {
  if (!validHeight(options.height) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const height = options.height;
  const width = layout(text, options, (glyph, offset) => {
    for (const element of glyph.elements) {
      const x1 = x + offset + element[0] * height * 0.58;
      const y1 = y + element[1] * height;
      if (element.length === 2) {
        drawing.point(x1, y1);
      } else {
        drawing.moveTo(x1, y1);
        drawing.lineTo(x + offset + element[2] * height * 0.58, y + element[3] * height);
      }
    }
  });
  drawing.moveTo(x + width, y);
}
