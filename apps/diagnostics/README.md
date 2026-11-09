# Rendering diagnostics

From the repository root, run `npm run dev` and open the local address printed
by Vite. The default is a static game-like scene in landscape orientation.

Use URL query parameters to change the view:

- `?scene=testcard` shows geometry, transform and intensity samples.
- `?orientation=portrait` selects portrait orientation.
- `?animate=1` rotates the craft in the game-like scene; it has no effect on
  the test card.

Parameters can be combined, for example `?scene=testcard&orientation=portrait`.
See [SPEC.md](SPEC.md) for the current diagnostic behavior.
