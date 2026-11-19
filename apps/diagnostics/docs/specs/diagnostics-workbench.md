# Diagnostics workbench

**Status: Accepted.**

**Implementation: Implemented.** The [diagnostics studies specification](SPEC.md)
describes the visual references available on Renderer & Performance.

## Purpose and screens

Explain why a canvas is clipped, stretched, blurry, or slow on a particular
display. Keep essential measurements beside the active canvas, with further
browser and renderer details available on demand. The app must remain useful
when a renderer or browser capability is unavailable.

| Screen | Essential view | Details on demand |
| --- | --- | --- |
| **Canvas & Environment** | Calibration canvas, independent stage clipping and browser visibility, mapping, backing resolution, rendering status, size controls, and report. | Canvas and content aspects, backing policy, browser measurements, WebGL2 capabilities, and history. |
| **Renderer & Performance** | Study and canvas, active WebGL2 status, backing buffer, profile, report, and timing state in Game. | Browser and canvas measurements, WebGL2 capabilities, and history. |

Open Canvas & Environment from the regular app entry. The published
`/test-card/` entry opens Renderer & Performance on Test Card. Keep the
existing study, orientation, and animation query links in
[README.md](../../README.md) working. Settings persist while switching
screens for the current session.

## Canvas & Environment

### Sizing and mapping

- Start with the **Very Angry Robots** reference settings: OMG-1, landscape
  4:3 content, automatic fit, and device backing scale capped at 2×. Fit the
  canvas within the available test stage, up to 1024 CSS pixels wide. The
  [gameplay presentation spec](../../../very-angry-robots/docs/specs/gameplay.md)
  defines the reference sizing behavior.
- **Use Robots settings** restores the reference settings. Show **Modified**
  whenever current calibration settings differ from that reference, including
  size mode or width, canvas or content aspect, mapping, and backing scale.
- **Auto size** fits the available stage up to 1024 CSS px wide. **Manual
  size** exposes a width field from 64 to 4096 CSS px. The resize handle
  enters Manual at the current width when dragged or adjusted by keyboard.
  Preserve the canvas aspect ratio. Manual dimensions may exceed the stage so
  clipping can be inspected.
- Canvas aspect and content aspect are separate settings. Offer 4:3, 16:9,
  1:1, 3:4, and custom canvas ratios. OMG-1 content uses the library's fixed
  1024 × 768 landscape or 768 × 1024 portrait extent. Generic content has
  independent virtual width and height and is rendered with **Canvas 2D**.
  Calibration orientation changes the content extent; study orientation is
  independent.
- Generic mapping offers **Preserve proportions** (uniform scale, centred
  with empty space when needed) and **Fill and stretch** (independent axis
  scales). Keep virtual coordinates, CSS canvas dimensions, and backing pixels
  distinct. The grid, square, circle, diagonals, and edge markers expose
  mapping, letterboxing, stretching, and clipping.
- Backing scale offers device scale, the Robots device-scale cap of 2×, and
  explicit scales. Calculate the requested allocation from the measured CSS
  rectangle and scale, rounding to whole pixels. Respect allocation limits;
  report the request, applied scale, and reason when capped or limited.

### Measurements and reports

Each rendered summary, details panel, and report uses one current measurement
snapshot. Keep these diagnoses independent:

- **Test-area clipping** compares the canvas bounds with its calibration or
  study stage.
- **Browser visibility** compares the whole canvas with the visible browser
  viewport. Report horizontal and vertical page overflow separately; page
  scrolling does not itself mean the canvas is clipped.
- **Content mapping** reports the selected content mapping and whether it
  preserves proportions, letterboxes, or stretches content.
- **Backing resolution** distinguishes requested dimensions, `canvas.width`
  and `canvas.height` attributes, and the actual WebGL2 drawing-buffer size.
  Show effective backing pixels per CSS pixel on each axis and explain
  differences caused by DPR caps, manual scale, integer rounding, allocation
  limits, or browser allocation. Report an unavailable buffer when allocation
  fails.

Show actual and target canvas aspect ratios separately. Browser details include
screen dimensions and available dimensions, DPR, viewport and root dimensions,
visual viewport measurements when available, viewport orientation, screen
orientation and angle when available, and fullscreen state. Use the layout
viewport for visibility when visual viewport measurements are unavailable.
Keep page overflow as a separate browser measurement.

Refresh the snapshot after relevant stage or viewport resize, scroll, zoom or
DPR change, rotation, fullscreen transition, backing change, and renderer
context change. A short bounded history records the trigger and before/after
measurements. Fullscreen keeps the workbench canvas and essential readouts
together and provides a visible exit action.

Provide **Copy report** on both screens. The local plain-text report begins
with the active test and essential measurements, then includes available
browser and renderer details and current timing state. If clipboard access is
missing or denied, show the report as selectable text and announce the result.

## Renderer & Performance

- Keep the Game scene, Test Card, Segment text, and Display profile studies
  available. See [the studies specification](SPEC.md) for their visual
  references and public links. Start static; animation requires explicit
  action, except for the documented `?animate=1` link.
- Identify whether the active calibration renderer is WebGL2 or Canvas 2D.
  For WebGL2, report whether the context is ready, lost, or unavailable and
  update on loss or restoration. Keep HTML measurements and the Generic
  Canvas 2D calibration usable when WebGL2 rendering fails.
- WebGL2 capability details may include context attributes, version,
  viewport, texture and renderbuffer limits, extensions, and shader precision
  when available. Vendor and renderer identifiers are optional details and
  are omitted from the default report.
- Show active profile and backing scale wherever they affect a study. Profile
  changes and the default comparison must not discard edits.

### Browser frame timing

The Game study offers **Run frame timing** and **Stop** for a repeatable
rotating workload and selectable backing scale. Label results as browser frame
timing. Show **Idle** when stopped and **Collecting** until at least two
seconds and 30 frame intervals have been sampled. Completed results lead with
median and 95th percentile frame intervals, followed by FPS, duration, and
sample count.

Keep the current run state separate from the two most recent completed runs.
Each retained run includes the CSS size, drawing buffer, profile, orientation,
and scale used for that run. Start a fresh sample after workload resolution or
profile changes, context interruption, or return from a hidden tab. A sample
must cover one uninterrupted visible period; hidden time is excluded.

## Input and presentation

Use labelled native controls with visible focus and readable text as well as
color cues. Keep live values selectable and exposed to assistive technology.
The screens share a restrained dark vector visual style; on narrow screens,
show the canvas and summary before detailed settings and allow page scrolling.

| Input | Required path |
| --- | --- |
| Keyboard | Tab and Shift+Tab navigate; native controls edit and activate. Escape closes an open detail or exits fullscreen where applicable. |
| Mouse | Click controls, enter exact values, and drag the resize handle. |
| Touch | Tap controls or drag the handle. Keep normal scrolling and pinch zoom available outside the handle. |
| Standard-mapped gamepad | D-pad or left stick moves focus; primary button activates; secondary button goes back; shoulders switch screens. Numeric edit mode supports fine and coarse steps. Keep focus visible and scroll it into view. |

Show the gamepad mapping in Controls help. Keep the visible settings and
actions available through the supported input paths; report platform
restrictions at the affected action.

## App boundary

The diagnostics app owns HTML, input, browser measurements, report generation,
and generic virtual-coordinate mapping. OMG-1 uses the public
`one-more-glow` API and the app's WebGL2 context for renderer measurements.
The Generic calibration pattern uses app-owned Canvas 2D. The library's
renderer-independent `DrawingContext` and fixed OMG-1 logical extent remain
defined by the [vector display specification](../../../../packages/one-more-glow/docs/specs/SPEC.md).

## Verification status

**2026-11-19.** Seven diagnostics tests, the workspace checks, and diagnostics
and project-base Pages production builds passed. Chrome checks covered the
local and published entries, clipping independently of browser visibility,
fit and stretch, DPR 3 with the Robots 2× cap, an oversized 3× allocation,
clipboard fallback, and WebGL2 loss and restoration on both screens. Timing
checks covered 1× and 2× runs with fixed CSS size, retained run conditions,
Idle, and restart after switching tabs. Keyboard editing, pointer resize,
fullscreen, emulated touch drag, and simulated standard-gamepad editing and
screen navigation passed.

Physical touchscreen drag, pinch zoom, and device rotation still need a phone
or tablet. Final gamepad verification needs a standard-mapped controller.
Installed PWA offline verification remains deferred.
