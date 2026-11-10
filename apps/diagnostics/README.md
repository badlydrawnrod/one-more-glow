# Rendering diagnostics

From the repository root, run `npm run dev` and open the local address printed
by Vite. The default is a static game-like scene in landscape orientation.

Use URL query parameters to change the view:

- `?scene=testcard` shows geometry, transform and intensity samples.
- `?scene=segments` compares the 16-segment design with the complete printable
  22-segment reference character set.
- `?scene=spacing` compares HUD text in both fonts with fixed and kerned spacing.
- `?orientation=portrait` selects portrait orientation.
- `?animate=1` rotates the craft in the game-like scene; it has no effect on
  the static diagnostic views.

Parameters can be combined, for example `?scene=testcard&orientation=portrait`.
See [SPEC.md](SPEC.md) for the current diagnostic behavior.

The library’s 22-segment font adapts Stewart C. Russell’s ThreeFourTwoTwo font
to vector strokes. See its [licence notice](../../packages/one-more-glow/THREEFOURTWOTWO-OFL.txt).
