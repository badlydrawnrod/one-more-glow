# Rendering diagnostics

From the repository root, run `npm run dev` and open the local address printed
by Vite. The app opens on **Canvas & Environment**, where the calibration
canvas, sizing controls, display measurements, change history, fullscreen, and
copyable report are available. **Renderer & Performance** contains the Test
Card, game scene, segment studies, and Display Profile study. Settings remain
in memory when switching screens.

The workbench supports keyboard, mouse, touch, and standard-mapped gamepad
controls. Open **Controls help** for the mappings. The calibration resize
handle works with pointer drag or arrow keys; the labelled width field and
range control change the same size setting. Use the animated Game workload
controls to start frame timing explicitly. Profile sliders adjust beam width,
point radius, glow strength, and glow spread live; Reset restores defaults.

URL query parameters remain available for opening a study directly:

- `?scene=testcard` shows geometry, transform and intensity samples, including
  a labelled comparison of normal intensity and overdrive.
- `?scene=segments` compares the 16-segment design with the printable
  22-segment reference character set.
- `?scene=spacing` compares HUD text in both fonts with fixed and kerned spacing.
- `?scene=profile` opens the Display Profile study.
- `?orientation=portrait` selects portrait orientation for the Game study.
- `?animate=1` starts the Game workload; it has no effect on other studies.

Parameters can be combined, for example `?scene=testcard&orientation=portrait`.
The published `/test-card/` entry opens the Test Card study. See
[the workbench specification](docs/specs/diagnostics-workbench.md) and the
[diagnostics baseline](docs/specs/SPEC.md) for behavior and status.

The library’s 22-segment font adapts Stewart C. Russell’s ThreeFourTwoTwo font
to vector strokes. See its [licence notice](../../packages/one-more-glow/THREEFOURTWOTWO-OFL.txt).
