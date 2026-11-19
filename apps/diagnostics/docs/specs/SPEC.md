# Rendering diagnostics

This is a reverse-engineered baseline of the current diagnostic app, not a
claim that every scene detail is an accepted design decision. See [README.md](../../README.md)
for how to run it and select views. Shared display requirements remain in the
[vector display specification](../../../../packages/one-more-glow/docs/specs/SPEC.md).

## Workbench redesign

- [Diagnostics workbench](diagnostics-workbench.md) is accepted and implemented.
  The user confirmed and accepts gamepad navigation, selection, and
  disconnect/reconnect behaviour. Touch-device, browser fallback, and several
  renderer-environment checks remain unverified because the required devices
  or browser conditions are unavailable.

## Purpose and current behavior

The diagnostic is a consumer of the public library API for inspecting the
renderer and evaluating display characteristics. It currently uses WebGL2.

- The Renderer & Performance screen starts on a static, game-like study with a
  grid, terrain, a craft and exhaust, a fuel pod and tractor beam, geometric
  enemies, shots and stars. Its optional workload rotates the craft.
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
  see the [library notice](../../../../packages/one-more-glow/THREEFOURTWOTWO-OFL.txt).
- A segment-spacing view compares both fonts and spacing modes using game HUD
  labels, digits and punctuation at small and larger sizes.
- The 22-segment interpretation includes dots and strokes below the baseline
  for descenders. It is not a hardware or ROM emulation.
- All views support landscape and portrait orientations. The canvas fits the
  window while preserving the selected aspect ratio, uses the device pixel
  ratio for its backing resolution, and updates on window resize.
- The diagnostic studies are static until the Game workload is started. The
  workbench controls change views without reloading; URL parameters remain
  available for opening a specific study directly.

## Superseded: overlay controls

The former in-canvas overlay menu was replaced by the accepted two-screen
navigation and labelled controls in [the diagnostics workbench spec](diagnostics-workbench.md).
The study choices, orientation setting, explicit Game animation control,
accessible selected states, and live profile controls remain part of the app.

## Accepted: overdrive comparison

**Implementation: Implemented.**

The test card provides a labelled comparison of normal intensity and overdrive
for evaluating the response specified in the [vector display specification](../../../../packages/one-more-glow/docs/specs/SPEC.md).
It shows lines and points in at least two distinct colours at intensities 0.5,
1, 1.25, 1.5 and 2, using the same colours and geometry at each intensity so
the changes in core colour and halo are easy to compare. The samples remain
legible in both landscape and portrait orientations.

## Accepted: display profile study

**Implementation: Implemented.**

The diagnostics offers a profile study with labelled HTML sliders for line width, point radius, glow strength and glow spread, plus a reset to defaults. The controls update the renderer profile live and show vector-drawn lines, crossing lines, points and overdrive samples under the same profile. Pointer, touch, keyboard and gamepad paths use the same settings. Profile values remain selected across scene and orientation changes for the current session.
