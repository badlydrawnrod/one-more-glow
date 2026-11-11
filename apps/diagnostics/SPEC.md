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
  diagonals for V. Both fonts use left stems and chamfered diagonal edges for
  uppercase B and D. The 22-segment font adapts Stewart C. Russell's
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
  scene. The in-page menu is the primary way to change views; URL parameters
  remain available for opening a specific view directly.

## Accepted: in-page controls

The diagnostics app provides a small overlay menu so visitors can change views
without editing the URL.

- The menu starts closed so the selected diagnostic view remains unobstructed.
- A persistent menu button over the canvas opens and closes the menu.
- The menu lets the visitor choose the game scene, test card, segment study or
  spacing study, and choose landscape or portrait orientation.
- The menu offers an animation toggle only while the game scene is selected.
  Animation stops when another scene is selected.
- Choosing an option updates the displayed view immediately, without a page
  reload. The menu closes after a scene or orientation is chosen; changing the
  animation toggle leaves it open.
- The controls use standard accessible HTML buttons and expose their selected
  state to assistive technology.
- Closing the menu leaves the menu button available to reopen it.
- Pressing Escape closes the menu and returns focus to the menu button.

## Accepted: overdrive comparison

**Implementation: Implemented.**

The test card provides a labelled comparison of normal intensity and overdrive
for evaluating the response specified in the [vector display specification](../../docs/specs/vector-display.md).
It shows lines and points in at least two distinct colours at intensities 0.5,
1, 1.25, 1.5 and 2, using the same colours and geometry at each intensity so
the changes in core colour and halo are easy to compare. The samples remain
legible in both landscape and portrait orientations.

## Accepted: display profile study

The diagnostics offers a profile study with vector-drawn controls for line width, point radius, glow strength and glow spread, plus a reset to defaults. The controls update the renderer profile live and show lines, crossing lines, points and overdrive samples under the same profile. Pointer and keyboard interaction and accessible labels are provided by the app. Profile values remain selected across scene and orientation changes for the current session.
