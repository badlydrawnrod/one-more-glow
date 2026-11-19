# Rendering diagnostics

From the repository root, run `npm run dev` and open the local address printed
by Vite. The app opens on **Canvas & Environment**. Use **Renderer &
Performance** for the Game scene, Test Card, Segment text, and Display profile
studies. Settings remain in memory when switching screens.

On Canvas & Environment, **Auto size** fits the test stage; **Manual size**
uses one CSS width field. Drag the canvas handle or edit the field to change
the same width. **Use Robots settings** restores the reference setup. The
summary distinguishes test-stage clipping, browser visibility, content
mapping, and backing resolution. Copy report is available on both screens and
shows selectable text if clipboard access is unavailable.

The workbench supports keyboard, mouse, touch, and standard-mapped gamepad
input. Open **Controls help** for the mappings. The Game workload starts only
when requested; timing results retain the two most recent completed runs and
their conditions. Display profile sliders adjust beam width, point radius,
glow strength, and glow spread. **Compare with defaults** keeps edits while
showing the default beam samples; Reset restores defaults.

URL query parameters remain available for opening studies directly:

- `?scene=testcard` opens Test Card, grouped as Joins and endpoints, Curves
  and transforms, and Overdrive.
- `?scene=segments` opens Segment text at **Glyphs**.
- `?scene=spacing` opens Segment text at **Spacing**.
- `?scene=profile` opens Display profile.
- `?orientation=portrait` selects portrait orientation for the Game study.
- `?animate=1` starts the Game workload; it has no effect on other studies.

Parameters can be combined, for example
`?scene=testcard&orientation=portrait`. The published `/test-card/` entry
opens Test Card. See [the workbench specification](docs/specs/diagnostics-workbench.md)
and [the studies specification](docs/specs/SPEC.md) for behavior and current
verification status.

The 22-segment font adapts Stewart C. Russell's
[ThreeFourTwoTwo font](https://fontlibrary.org/en/font/threefourtwotwo), based
on the [Litronix DL-3422 character chart](https://bitsavers.trailing-edge.com/components/litronix/_dataBooks/1982_Litronix_Optoelectronics_Catalog.pdf#page=85),
to vector line centres. See the font's [OFL notice](../../packages/one-more-glow/THREEFOURTWOTWO-OFL.txt).
