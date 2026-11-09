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
- Both views support landscape and portrait orientations. The canvas fits the
  window while preserving the selected aspect ratio, uses the device pixel
  ratio for its backing resolution, and updates on window resize.
- The test card is static; the animation option only affects the game-like
  scene. There are no in-page controls: view options are selected in the URL.
