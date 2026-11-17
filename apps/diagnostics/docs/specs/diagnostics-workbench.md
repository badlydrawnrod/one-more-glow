# Diagnostics workbench

**Status: Proposed.** The [diagnostics app specification](SPEC.md) describes the
current implementation. This draft describes the proposed redesign.

## Purpose

Make it easy to explain why a canvas looks clipped, stretched, blurry, or slow
on a particular display. Give the first screen enough information to diagnose
fit and scaling at a glance, with a path from each summary to the measurements
that explain it. Keep the app usable on a phone, at a desk, and with a gamepad.

## Screens

| Screen | Visible on arrival | Available on demand |
| --- | --- | --- |
| **Canvas & Environment** | Calibration canvas, sizing preset, OMG-1 or Generic mode, canvas aspect ratio, resize and fullscreen controls. Show whole-canvas visibility, aspect ratio result, available and used CSS space, backing resolution, effective pixel scale, DPR, orientation, and page fullscreen state. | Custom aspect ratio and virtual dimensions, fit and pixel scale controls, raw display and viewport measurements, recent changes, and a copyable report. |
| **Renderer & Performance** | Study selector and canvas, WebGL2 availability and context status, drawing buffer size, and a frame timing summary when a workload is active. | Study controls, workload backing scale, WebGL capability details, sample duration and frame count, and a copyable report. |

Use a persistent two-item navigation and keep test settings for the session when
switching screens. Open **Canvas & Environment** at the regular app entry. Open
the Test Card study in **Renderer & Performance** at the published `/test-card/`
entry. Keep the existing study links and their applicable options working.
See the [publication specification](../../../../docs/specs/github-pages-pwa.md).

## Visual design and accessibility

Take the visual language from the vector display. Use a deep, quiet background,
fine geometric rules, crisp cyan accents, and restrained amber for warnings.
Reserve the strongest glow and colour for the canvas. Use legible text for
controls and labels, and monospaced numerals so changing dimensions stay easy
to compare. Style both screens with the same CSS and keep assets local for the
offline app.

On wide layouts, put the summary beside the canvas so a visitor can see the
pattern and the measurements together. On narrow layouts, put the canvas and
fit summary before the detailed panels and let the page scroll. Keep the test
area visually distinct from the controls and show its boundaries. Give controls
visible labels, generous touch targets, and a focus indicator distinct from the
selected state. Use readable contrast and express results in text as well as
colour. Keep live values selectable and available to assistive technology.
Announce discrete results such as copying a report. Start with a static pattern
and let visitors start animation explicitly.

| HTML and CSS | Canvas |
| --- | --- |
| Navigation, labels, resize handle, settings, measured values, status, help, logs, and report. | Calibration geometry and renderer study content, including vector text, intensity samples and animated scenes. |

## Canvas & Environment

### Set up the test

- Start with a **Very Angry Robots** preset in OMG-1 landscape. Fit its 4:3
  canvas to the width and height available after surrounding UI, up to 1024 CSS
  pixels wide. Scale its backing resolution by DPR up to 2.
  The [gameplay presentation spec](../../../very-angry-robots/docs/specs/gameplay.md)
  describes the reference behaviour. The diagnostic stage represents the space
  available to a game within its page.
- Offer automatic fit and manual CSS sizing. A mouse or touch drag on the HTML
  resize handle and a focusable size control change the same setting. Manual
  sizing can exceed the available space to reproduce overflow. Show requested
  dimensions alongside the measured size when they differ.
- Offer 4:3, 16:9, 1:1, 3:4, and custom canvas aspect ratios. Preserve the
  chosen ratio during manual resize. Report the actual ratio separately from
  the target so layout or rounding differences are visible.
- Provide **OMG-1** and **Generic** modes. OMG-1 uses the library's fixed
  1024 × 768 landscape or 768 × 1024 portrait logical extent and its uniform
  mapping. Visitors can choose a different canvas ratio to see the resulting
  letterboxing. Generic mode lets visitors set the virtual width and height
  independently of the displayed canvas ratio. Offer **Fit** (uniform scale,
  centred with empty space where needed) and **Stretch** (independent axis
  scales) for the generic pattern.
- Keep virtual dimensions, displayed CSS dimensions and backing pixels
  separate. Offer device scale, the Robots cap, and a manual backing scale.
  Calculate the target backing dimensions from the measured CSS size and
  selected scale, rounding to whole pixels. Validate custom sizes and report
  any limit that prevents using the requested size.
- Draw a grid, centre axes, squares, circles, diagonals, and inset
  edge markers. A circle should reveal stretching immediately. Keep enough
  contrast between the mapped content, empty canvas space, and surrounding HTML
  to distinguish letterboxing from clipping.

### Read the results

| Measurement | Behaviour |
| --- | --- |
| **Fits in view** | Say whether the entire canvas is visible at the current scroll and zoom position. Compare its measured bounds with the visible viewport and any clipping by the test area. Report horizontal and vertical page overflow separately, since a page can scroll while the canvas is fully visible. |
| **Space and shape** | Show the available stage width and height, the canvas CSS rectangle from `getBoundingClientRect()`, and actual versus target aspect ratio. Distinguish canvas shape from whether the mapped pattern preserves its proportions. |
| **Backing resolution** | Show requested and actual `canvas.width` and `canvas.height` in backing pixels and the resulting backing pixels per CSS pixel on both axes. Compare with the selected scale after integer rounding, and identify when the scale is capped or manual. For WebGL2, also show the actual drawing buffer dimensions when they differ from the canvas attributes. |
| **Display details** | Show `screen.width`, `screen.height`, `screen.availWidth`, and `screen.availHeight` in CSS pixels, plus DPR. Report `screen.orientation` type and angle where available. Label viewport orientation separately. |
| **Viewport details** | Show `window.innerWidth` and `innerHeight`, root `clientWidth` and `clientHeight`, and visual viewport width, height, scale, and offsets where available. Label visual viewport scale as such. Use the layout viewport for the visibility check when visual viewport measurements are unavailable. |

Update the readout when the stage or viewport resizes, DPR changes, the device
rotates, the page scrolls, the visual viewport changes, or the workbench enters
or exits fullscreen. Provide a fullscreen control that keeps the canvas and
essential readouts together, with a visible way to exit. Report page fullscreen
state from the document and mark browser values or actions that are unavailable.
A short, bounded change log shows the trigger and before/after values for resize,
orientation, scaling, and fullscreen changes. Use observed values and events
as the labels when browser zoom changes the measurements.

**Copy report** is available on both screens and produces a local plain text
snapshot of the selected settings, measurements, and available renderer
results. Offer selectable text if direct copy is unavailable. Keep the report
limited to diagnostic data and show the current sample state alongside any
frame timing results.

## Renderer & Performance

- Keep the existing Test Card, game scene, segment and spacing studies, and
  display profile study available as study choices in this screen. Preserve the
  Test Card's overdrive comparison and the live beam, point and glow adjustments.
  Show the profile controls in HTML beside their vector samples.
- Show whether WebGL2 started and whether the active context is ready, lost,
  or unavailable. Refresh the status when the context is lost or restored.
  Keep the HTML diagnostics usable when rendering fails. In
  capability details show context attributes, version, viewport, texture and
  renderbuffer limits, extensions, and shader precision when reported. Treat
  vendor and renderer identifiers as optional detail and omit them from the
  default report.
- Start and stop a repeatable animated workload. Use the rotating game scene
  as the initial workload and let visitors adjust its backing scale. Label the
  workload and drawing buffer size so results can be compared under the same
  conditions.
- Report FPS and median and 95th percentile frame intervals from the active
  animation loop, with duration and sample count in details. Label them as
  browser frame timing. Show **Idle** when stopped and **Collecting** until the
  sample spans at least two seconds and 30 frame intervals. Start a fresh sample
  after workload or resolution changes, context interruption, or return from a
  hidden tab. Keep each sample within one uninterrupted period of visibility.

## Input

Use the same visible controls and settings for all four inputs. Presets,
custom numeric values, disclosures, studies, profile sliders, reset, and
screen navigation all need a path with each input. Report platform restrictions
at the relevant action and keep the rest of the app usable.

| Input | Interaction |
| --- | --- |
| Keyboard | Tab and Shift+Tab move between controls. Use native buttons and field behaviour for activation and editing. Escape closes the open panel or exits fullscreen and restores focus to the initiating control where applicable. |
| Mouse | Click controls, use fields or steppers for exact values, and drag the resize handle. |
| Touch | Tap the same controls or drag the handle. Keep normal scrolling and pinch zoom available outside the resize handle so zoom can be examined. |
| Gamepad | With a standard-mapped pad, use the D-pad or left stick to move focus, the primary button to activate, the secondary button to go back, and shoulders to switch screens. Numeric fields have an edit mode with fine and coarse steps so custom values are practical to enter. Keep focus visible and scroll it into view. Show the mapping in Controls help. |

## App and library boundary

The diagnostics app owns HTML, input, browser measurements, report generation,
and generic virtual coordinate mapping. OMG-1 studies draw through the public
`one-more-glow` API and use the app's WebGL2 context for backend measurements.
The generic pattern can use an app-owned Canvas 2D drawing path and should be
labelled accordingly. The [vector display specification](../../../../packages/one-more-glow/docs/specs/SPEC.md)
continues to define the fixed OMG-1 logical space and renderer-independent
`DrawingContext`. Use native controls and ordinary CSS so settings, layout, and
input behaviour stay easy to maintain when the test patterns change. Use the
same collected measurements for the summary, details, and report.

## Verification scenarios

- In the Robots preset, narrow and shorten the window, change page zoom, rotate
  a phone, pinch zoom, and enter and exit fullscreen. Check fit, overflow,
  orientation, and backing scale against the visible result and raw values.
- Select a 16:9 canvas with a 4:3 virtual space. Fit should show side bars and
  preserve circles. Stretch should fill the canvas and widen the circles. Check
  a fractional CSS size and confirm backing rounding is explained in the readout.
- Navigate both screens and set a custom size using each of the four inputs.
  Open details and the report, and check focus and the report fallback.
- Start the same workload at two backing scales. Check that timing restarts,
  hidden time is excluded, and static or unavailable rendering has a clear
  status. Check that the environment readings remain available with WebGL2
  disabled.
- Open the published Test Card entry and existing study links. Check that the
  selected studies appear and remain reachable after switching screens.
