# Segment text proposal

**Status: Proposed — not an instruction to implement.**

## Intent

Provide legible, retro-inspired text for scores, HUDs and other short messages,
drawn with the same luminous vector treatment as the rest of One More Glow.
Both 16- and 22-segment character cells are being evaluated. The current
16-segment diagnostic was well received and should remain available while the
22-segment study develops. These are visual designs for the imaginary console,
not attempts to reproduce physical hardware.

## Candidate character cell

Use a fixed grid of independently selected straight strokes. A glyph selects
some strokes from the same grid; it does not draw the unselected strokes. The
following is a concrete candidate for review, not a final glyph design:

- A rectangular cell has horizontal positions left, centre and right, and
  vertical positions at the top, three-quarter height, middle, one-quarter
  height and baseline.
- At each of the five heights, two horizontal segments join left to centre and
  centre to right: **10 segments**.
- Each outer side has an upper and lower vertical segment: **4 segments**.
- The centre vertical is divided into four segments, one between each
  neighbouring pair of heights: **4 segments**.
- Four diagonal segments join each corner to the centre of the cell:
  **4 segments**.

That is 22 line segments. Intersections do not automatically turn other
segments on. A glyph design may use continuous adjoining strokes rather than
visibly separated LED-like bars; evaluate the result with the renderer's glow.
Punctuation dots, if used, are additional marks and are not included in the
22-stroke count. Their geometry and placement are open.

The extra subdivisions and crossbars may improve some glyphs, but may also
make the design busy or expensive to draw. Compare an actual alphabet and
common HUD strings with a 16-segment alternative before choosing the layout.
Neither the grid nor the exact segment count is accepted yet.

## Proposed first use

- Draw single-line, left-to-right text in fixed-width cells, using a caller's
  position and requested character height in logical coordinates. Leave exact
  proportions, spacing and origin convention for visual review.
- Start with uppercase Latin letters, digits, space and common HUD punctuation.
  The 22-segment study also explores lowercase; lowercase coverage, the exact
  punctuation and unsupported-character behavior remain open. This does not
  imply general Unicode or localization support.
- Use a renderer-independent helper that submits existing line and point
  operations through `DrawingContext`, as the derived-geometry helpers do.
  No new renderer-specific text primitive or method on `DrawingContext` is
  proposed.
- Text inherits current colour, intensity, transforms, drawing order and beam
  appearance. Scaling text geometry does not scale the screen-space beam
  profile. Rendering may use normal backend batching.

The public function signature, measurement API, character mappings, handling
of multiline text and pen position after drawing are not decided. Alignment,
wrapping and general text layout are also open; a single-line starting point
does not rule them in or out later.

## Evaluation

Before accepting an API or committing to a glyph set, make a visual study in
the diagnostics app showing the proposed alphabet, digits and representative
game HUD strings at several sizes and intensities. Compare 16 and 22 segments
for readability, character and cost, including crowded intersections and halo
overlap. Check that text remains legible in landscape and portrait views.

The diagnostic also explores the DL-3422 character set using vector line
centres adapted from Stewart C. Russell's
[ThreeFourTwoTwo font](https://fontlibrary.org/en/font/threefourtwotwo), based on
the [Litronix character chart](https://bitsavers.trailing-edge.com/components/litronix/_dataBooks/1982_Litronix_Optoelectronics_Catalog.pdf#page=85).
It includes punctuation dots and descenders and is a separate candidate from
the grid above; it is not a hardware or ROM emulation. The final layout remains
open.

Any eventual implementation should test observable glyph selection, spacing,
fallback behavior and transformation semantics, rather than relying on exact
renderer internals. Visual review remains important because legibility and
appearance are not established by geometry tests alone.
