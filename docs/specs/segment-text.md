# Segment text specification

**Status: Accepted and implemented.** Glyphs and spacing can be refined through
visual review.

## Purpose and fonts

Provide retro-inspired vector text for scores, HUDs and other short messages.
The library API offers both the 16- and 22-segment designs shown
in the diagnostic. These are designs for the imaginary console, not attempts
to emulate display hardware.

**Agreed initial coverage:** the 22-segment font supports printable ASCII
(`U+0020`–`U+007E`). The 16-segment font supports uppercase Latin letters,
digits, space and `. , : ! ? + - /`; ASCII lowercase maps to uppercase. Both
fonts provide a recognisable `?` replacement glyph. Glyph shapes and spacing
can be refined through visual review.

The 22-segment diagnostic adapts Stewart C. Russell's
[ThreeFourTwoTwo font](https://fontlibrary.org/en/font/threefourtwotwo), based on
the [Litronix DL-3422 character chart](https://bitsavers.trailing-edge.com/components/litronix/_dataBooks/1982_Litronix_Optoelectronics_Catalog.pdf#page=85).
The source font's licence and attribution must accompany any adaptation used
in the library; see the library's
[licence notice](../../packages/one-more-glow/THREEFOURTWOTWO-OFL.txt).

## Public API

Provide renderer-independent helpers, exported through the public library entry
point, rather than adding methods to `DrawingContext`:

```ts
interface TextOptions {
  font: "segment16" | "segment22";
  height: number;
  spacing?: "fixed" | "kerned";
}

interface TextMetrics {
  width: number;
  ascent: number;
  descent: number;
}

function drawText(
  drawing: DrawingContext,
  text: string,
  x: number,
  y: number,
  options: TextOptions,
): void;

function measureText(text: string, options: TextOptions): TextMetrics;
```

Both helpers use the same font, size, character substitution and spacing
rules. The default is fixed spacing.

**Agreed invalid-input behavior:** a zero, negative or non-finite height makes
`drawText` a no-op and makes `measureText` return zero for width, ascent and
descent. A non-finite `x` or `y` makes `drawText` a no-op. These cases do not
throw; a drawing no-op leaves the pen and drawing state unchanged.

## Layout and metrics

Text is a single line progressing left to right. The supplied `(x, y)` is the
start of its baseline in local logical coordinates. `height` is uppercase
height in logical units; lowercase descenders can extend below the baseline.

`measureText` returns these values in local logical units, before any drawing
transform:

- `width` is the horizontal advance from the start to the position for a next
  character. It includes spaces and applicable spacing adjustments. It is not
  necessarily the bounds of the visible strokes.
- `ascent` and `descent` are non-negative, font-wide distances above and below
  the baseline. Their sum is the nominal full height, independent of which
  characters appear in the string and excluding the screen-space beam and halo.

An empty string has zero width; a normal space is a supported blank with
advance. Trailing spaces contribute to the advance. The 16-segment descent is
0.25 times uppercase height, accounting for the comma; the 22-segment descent
is 0.35 times uppercase height.

Fixed spacing uses equal character advances. Kerned spacing uses proportional
advances and pair adjustments. **Agreed:** kerning applies only within a single
call; no state or pair adjustment carries across separate drawing calls. Text
split across calls can consequently look slightly different from the same text
drawn in one call.

**Agreed starting proportions:** for both fonts, use a full-width cell of 0.58
times uppercase height and a fixed advance of 0.82 times uppercase height.
Kerned spacing uses a gap of 0.16 times height, a space advance of 0.32 times
height and font-specific pair adjustments. Refine these values through visual review.

## Characters and fallback

**Agreed:** the 16-segment font maps ASCII lowercase to uppercase before checking
coverage. For either font, each unsupported Unicode code point is replaced by
one visible `?`, including unsupported controls and line breaks. The helpers
use code points rather than UTF-16 code units; they do not provide Unicode
normalisation, grapheme shaping or general text layout. Thus a precomposed
character and a sequence with a combining mark can produce different results.

Measurement uses the same replacement glyph and advance as drawing. No strict
mode or configurable replacement is proposed for the initial API.

## Drawing state and pen

Text uses the active colour, intensity, transform and drawing order through
normal line and point operations. Glyph geometry is transformed like other
drawing commands; scaling geometry does not scale the screen-space beam
profile. The helper does not change colour, intensity or the transform stack.

**Agreed:** after drawing, the current pen position is on the baseline at the
start position plus the measured horizontal advance, transformed by the active
transform. This is the position for a next character without a cross-call
kerning adjustment. With valid inputs, an empty string therefore leaves the pen
at the supplied start position. Callers may use `lineTo` from that position.

## Scope and verification

Wrapping, multiline layout, alignment options, ink bounds and general-purpose
typography remain open; they are not requirements for this first design. A
caller can use the measured advance to position a line. Detailed glyph
definitions and spacing values remain open to refinement.

Verify observable glyph selection, spacing, fallback, metrics, invalid-input
behavior, pen position and transformation semantics without depending on
renderer internals. Use the diagnostics for visual review at different sizes,
intensities and display orientations; geometry tests alone cannot establish
legibility.
