# Rendering diagnostics

This is a reverse-engineered baseline of the current diagnostic app, not a
claim that every scene detail is an accepted design decision. See [README.md](README.md)
for how to run it and select views. Shared display requirements remain in the
[vector display specification](../../docs/specs/vector-display.md).

## Purpose and current behavior

The diagnostic is a consumer of the public library API for inspecting the
renderer and evaluating display characteristics. It currently uses WebGL2.

- The default view is a static, game-like scene with a grid, terrain, a craft
  and exhaust, a fuel pod and tractor beam, geometric enemies, shots and stars.
  An optional animation rotates the craft continuously.
- The test card presents open paths and closed outlines at several intensities,
  a central line, triangle and point, transformed craft, line and point
  samples, circles, ellipses, arcs and nested rectangles. These examples make
  geometry, transformations, intensity and halo appearance easier to inspect.
- An experimental segment-text view compares the 16-segment alphabet, digits
  and HUD sample with the 22-segment printable character set, a HUD sample and
  a kerned mixed-case sentence. It uses the public text helpers.
  The 16-segment font joins its top and bottom halves and adds two
  diagonals for V. The 22-segment font adapts Stewart C. Russell's
  [ThreeFourTwoTwo font](https://fontlibrary.org/en/font/threefourtwotwo), based
  on the [Litronix DL-3422 chart](https://bitsavers.trailing-edge.com/components/litronix/_dataBooks/1982_Litronix_Optoelectronics_Catalog.pdf#page=85),
  into vector line centres. The adaptation retains the source font's licence;
  see the [library notice](../../packages/one-more-glow/THREEFOURTWOTWO-OFL.txt).
- A segment-spacing view compares both fonts and spacing modes using game HUD
  labels, digits and punctuation at small and larger sizes.
- The 22-segment interpretation includes dots and strokes below the baseline
  for descenders. It is not a hardware or ROM emulation.
- All views support landscape and portrait orientations. The canvas fits the
  window while preserving the selected aspect ratio, uses the device pixel
  ratio for its backing resolution, and updates on window resize.
- The diagnostic views are static; the animation option only affects the game-like
  scene. There are no in-page controls: view options are selected in the URL.
