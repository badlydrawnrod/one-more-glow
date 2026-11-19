# Rendering diagnostics

The diagnostics app is an independent consumer of the public `one-more-glow`
API. It provides calibration and renderer studies for checking vector output
and display behavior. See [README.md](../../README.md) for navigation and
[Diagnostics workbench](diagnostics-workbench.md) for the accepted workbench
behavior. Shared display behavior remains defined by the
[vector display specification](../../../../packages/one-more-glow/docs/specs/SPEC.md).

## Current studies

**Implementation: Implemented.** Renderer & Performance offers a Game scene,
Test Card, Segment text, and Display profile studies. Game animation and frame
timing start via **Run frame timing** or the `?animate=1` link.

### Test Card

**Status: Accepted.**

The Test Card groups samples as **Joins and endpoints**, **Curves and
transforms**, and **Overdrive**. It uses open paths and closed outlines at
several intensities, basic line and point samples, circles, ellipses, arcs,
and transformed outlines. The overdrive group labels line and point samples
in cyan and magenta at intensities 0.5, 1, 1.25, 1.5, and 2, using matching
geometry at every level. This exercises the response defined in the vector
display specification.

### Segment text

**Glyphs** compares matching text at the same size in the 16-segment design
and the 22-segment printable chart, including the complete ASCII 20–7F chart
and score examples. **Spacing** compares fixed and kerned advances at small
and large sizes using score digits, punctuation, lowercase and descenders;
baseline markers make digit alignment and text advance visible. The study
uses the public renderer-independent text helpers. The 22-segment
interpretation includes dots and strokes below the baseline for descenders;
it is not hardware or ROM emulation.

The 16-segment font joins its top and bottom halves and adds two diagonals for
V. Both fonts use left stems and chamfered diagonal edges for uppercase B and
D. The 22-segment font adapts Stewart C. Russell's
[ThreeFourTwoTwo font](https://fontlibrary.org/en/font/threefourtwotwo), based
on the [Litronix DL-3422 chart](https://bitsavers.trailing-edge.com/components/litronix/_dataBooks/1982_Litronix_Optoelectronics_Catalog.pdf#page=85),
into vector line centres. The adaptation retains the source font's licence;
see the [OFL notice](../../../../packages/one-more-glow/THREEFOURTWOTWO-OFL.txt).

### Display profile

**Status: Accepted.**

The Display profile study shows real line, crossing-line, point, and overdrive
beam samples under the active profile. HTML controls adjust beam width, point
radius, glow strength, and glow spread and display their numeric values.
**Compare with defaults** toggles the same samples between the edited profile
and library defaults without discarding edits; reset restores defaults.
Profile and backing settings are identified in the study readout and report.

## Legacy study links

Keep these documented links working:

- `?scene=testcard` opens Test Card.
- `?scene=segments` opens Segment text at **Glyphs**.
- `?scene=spacing` opens Segment text at **Spacing**.
- `?scene=profile` opens Display profile.
- `?orientation=portrait` selects portrait orientation for the Game study.
- `?animate=1` starts the Game workload; it has no effect on other studies.

Parameters can be combined, for example
`?scene=testcard&orientation=portrait`. The published `/test-card/` entry
opens Test Card. Calibration orientation and study orientation are independent.

## Verification status

Chrome checks covered Test Card aspect and backing dimensions in both
orientations at desktop and emulated phone sizes. The study samples, legacy
links, profile edits, comparison, reset, and persistence across studies were
checked in the browser. See [workbench verification](diagnostics-workbench.md#verification-status)
for the environment and input coverage.
