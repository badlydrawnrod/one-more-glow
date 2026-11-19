# Implement the diagnostics workbench

**Status:** In progress

## Objective

Deliver the accepted two-screen workbench. A visitor should be able to diagnose
canvas fit and scaling on arrival, then run a renderer study or measure an
animated workload using any of the four supported input methods.

## Durable references

- [Accepted workbench spec](../../docs/specs/diagnostics-workbench.md) and
  [current diagnostics baseline](../../docs/specs/SPEC.md)
- [Very Angry Robots presentation](../../../very-angry-robots/docs/specs/gameplay.md)
  and [OMG-1 display contract](../../../../packages/one-more-glow/docs/specs/SPEC.md)
- [Pages publication contract](../../../../docs/specs/github-pages-pwa.md),
  [repository architecture](../../../../docs/architecture.md), and
  [plan lifecycle](../../../../plans/README.md)

## Scope

- Work in the existing `diagnostics` workspace. Deliver both screens, browser
  measurements, calibration patterns, existing studies, frame timing, reports,
  and keyboard, mouse, touch, and gamepad interaction.
- Preserve the public `one-more-glow` API, the library's fixed OMG-1 coordinate
  spaces, the other apps, and the current Pages route and PWA identity.

## Starting points and implementation choices

| File | What to use |
| --- | --- |
| [index.html](../../index.html) | Existing app shell, overlay styles, accessible scene buttons and four profile inputs. Keep the app mount, manifest and entry script. Replace the overlay with semantic HTML and a shared stylesheet. |
| [main.ts](../../src/main.ts) | Current query parsing, canvas sizing, `drawTestCard`, `drawGameScene`, `drawDiagnostic`, `drawProfileStudy`, and animation. Move the existing study drawing code as needed and keep its geometry, text and intensity samples. |
| [segment-study.ts](../../src/segment-study.ts) | Existing segment and spacing drawing functions. Reuse them for the corresponding study choices. |
| [pwa.ts](../../src/pwa.ts) and [Pages allowlist](../../../../tools/pages-publication.mjs) | The app registers its worker against the Vite base. Pages sets `VITE_DEFAULT_SCENE=testcard` for this workspace. Use that flag to select the published opening view. |
| [Robots style](../../../very-angry-robots/src/style.css) and [Robots resize logic](../../../very-angry-robots/src/main.ts) | Reference for fitting into a stage and capping backing scale. Read them for comparison. All workbench code lives in diagnostics. |

Use `main.ts` to wire the screens, settings and active surface together. Put
independently testable sizing and frame arithmetic in small app-local functions.
Keep separate canvas elements for Canvas 2D and WebGL2. Use Canvas 2D for the
Generic calibration pattern and the public `createWebGL2Renderer` for OMG-1.
An orientation change needs an appropriately configured renderer. Reuse a
surface for each OMG-1 orientation if needed to keep the number of contexts
bounded across repeated switches. Keep one study animation loop and a separate
gamepad poll.

## Work

Complete the steps in order. After each step, record the result and what is
still pending here, then set **Next action** to the first unchecked step.

### 1. Establish the baseline and build the shell

- [x] Run `npm run dev` from the root. Confirm the study links below, portrait
  layout, overdrive comparison and live profile controls. Read `index.html`
  and `src/main.ts` before moving existing markup or drawing code.
- [x] Build the two HTML screens and persistent navigation. Put the existing
  studies in Renderer & Performance and move the visual sliders and reset
  into visible, labelled HTML controls. Keep the profile comparison samples on
  the canvas. Move and resize the shell in CSS. Put readouts alongside the
  stage on wide screens and after the canvas on narrow screens. Use the palette,
  focus and contrast requirements from the spec.
- [x] Parse startup selection once. A valid explicit `scene` selects that
  study. The Pages flag selects Test Card when there is no explicit study.
  Preserve `?orientation=portrait` and `?animate=1` at the regular entry by
  opening the legacy game study when those links omit `scene`. Animation only
  applies to Game. A regular entry without a study or legacy option opens
  Canvas & Environment. Keep settings in memory across screen changes.

**Checkpoint.** Both screens are reachable without reloading. The five study
values `game`, `testcard`, `segments`, `spacing` and `profile` still select the
right study. Confirm `?scene=testcard&orientation=portrait` and that profile
values survive switching studies and screens. Check keyboard focus on both
layouts. Run `npm run check --workspace=diagnostics` once the library is built.

**Step 1 results (2026-11-18).** Replaced the canvas overlay with persistent
screen navigation and a responsive HTML shell. The regular entry opens Canvas
& Environment; explicit study URLs, the Pages Test Card default, and legacy
portrait/animation links open Renderer & Performance. All five studies remain
selectable, and profile controls now sit beside the canvas samples. Browser
checks confirmed profile values persist across screen switches, portrait
Test Card selection, the Pages default, and the legacy links. Wide-layout
keyboard focus is visible. Narrow-layout keyboard focus and profile persistence
after changing away from the profile study remain pending for the responsive
browser pass. `npm run check --workspace=diagnostics` passed; `git diff --check`
passed.

### 2. Build the calibration canvas and its controls

- [x] Give the calibration area a measurable stage sized by the page layout.
  For auto fit, choose the smallest of stage
  width, stage height multiplied by target ratio, and the active preset's width
  cap. Derive height from width and ratio. The initial Robots preset selects
  OMG-1 landscape, 4:3, a 1024 CSS pixel width cap, and `min(DPR, 2)`.
- [x] Add manual sizing, target ratio presets and custom ratio fields, OMG-1
  orientation, Generic virtual width and height, Fit and Stretch, and backing
  scale selection. Route the resize handle and focusable size control through
  the same manual-size update. Limit pointer capture and `touch-action` to the
  handle. Validate finite positive sizes and scales. Keep the previous valid
  setting while a field is incomplete and show limits or rejected values.
- [x] Set the CSS size, measure the visible canvas, then compute target backing
  width and height by rounding each measured CSS dimension times selected
  scale. Guard allocations against oversized requests and assign canvas
  attributes only when dimensions change. Skip sizing while the active element
  has no measurable area. Keep requested, applied and measured values distinct.
- [x] Draw the calibration geometry in each mode. For Generic Fit, use the
  smaller of output width divided by virtual width and output height divided
  by virtual height, then centre the result. For Stretch, use each axis's own
  scale. Make the stage, canvas, and mapped content edges distinguishable. In
  OMG-1, submit the calibration geometry in the selected fixed logical extent
  and let the library perform its mapping.

**Checkpoint.** At a stage of at least 1200 × 900 CSS px the Robots preset
requests 1024 × 768 CSS px. At DPR 3 it requests 2048 × 1536 backing pixels.
A 16:9 canvas with 1024 × 768 Generic content shows side bars in Fit and wider
circles in Stretch. Manual oversizing can visibly leave the available area.

**Step 2 results (2026-11-18).** Added a measurable calibration stage with
the Robots fit preset, manual sizing, preset and custom ratios, OMG-1
orientation, Generic virtual dimensions and Fit/Stretch mapping, and backing
scale choices. The resize handle, width field and range control share the same
manual-size state. Canvas CSS bounds are measured before backing dimensions are
rounded; requested CSS size, measured CSS size and applied backing buffer are
shown separately. Generic Canvas 2D and per-orientation OMG-1 WebGL2 surfaces
draw the calibration pattern. The canvas allocation is capped at 32 megapixels.

`npm run check --workspace=diagnostics` and `git diff --check` passed. Manual
browser checks (ChatGPT in-app browser, 2026-11-18) used an 1800 × 1400
viewport override. The Robots preset requested 1024 × 768 CSS px in its 4:3
mode. The Generic 16:9 canvas at 1313 × 738.6 CSS px showed side bars and a
round circle in Fit; Stretch filled the canvas and visibly widened the circle.
Setting manual width to 1600 CSS px produced a 1600 × 900 canvas that visibly
extended beyond the stage. The device-scale mode reported 1× with a 1024 × 768
backing buffer under the viewport override; selecting manual 3× produced a
3072 × 2304 backing buffer. The viewport override does not expose DPR control,
so the specific DPR 3 / device-scale-capped-at-2 check remains pending.

### 3. Add measurements, history and fullscreen

- [x] Build one measurement snapshot for the summary, raw details and the
  report. Read the stage and canvas rectangles, page overflow, display, layout
  viewport, visual viewport, orientation, and fullscreen fields listed in the
  spec. For the visibility check use rectangles in the same coordinate space.
  Compare the canvas with visual viewport bounds including offsets and any
  clipping by the stage. Fall back to the layout viewport. Keep the root
  scroll extent check separate. Compute effective X and Y pixel scale from
  the actual buffer and measured CSS dimensions for each axis.
- [x] Observe the stage with `ResizeObserver`. Refresh on window resize and
  scroll, visual viewport resize and scroll, orientation and fullscreen change,
  and DPR change. A resolution media query can watch the current DPR. Rearm it
  after each change. Coalesce measurement work to one update per frame and skip
  unchanged values in the bounded before/after history. Use the same refresh
  path after settings change or a hidden screen becomes visible.
- [x] Add fullscreen on a workbench container that includes its readouts and
  exit control. Drive status from the document's fullscreen state and handle
  unavailable or denied requests in the UI. Start the Copy report action on
  both screens with plain text and a selectable fallback. In step 4, connect
  the available WebGL and frame timing fields to this same report.

**Checkpoint.** Use narrow and short viewport sizes, scroll, zoom and toggle
fullscreen. Check that whole-canvas visibility and page overflow can report
different results. Inspect raw values against the browser console. Verify a
missing optional measurement and the report fallback both have a readable state.

**Step 3 results (2026-11-18).** Added a shared measurement snapshot used by
the Canvas & Environment summary, expandable raw values, and both screen
reports. It includes stage and canvas rectangles, visible viewport bounds and
stage clipping, actual and target aspect ratios, effective backing scale on
both axes, page overflow, screen dimensions, DPR, layout and visual viewport
values, orientation, and fullscreen state. A `ResizeObserver` plus resize,
scroll, visual viewport, orientation, DPR, settings, screen-switch, and
fullscreen events feed one animation-frame refresh path. Changed snapshots
produce an eight-entry before/after history. Fullscreen covers the workbench
and keeps its exit button available. Copy report writes plain text and exposes
a selectable textarea if clipboard access fails.

`npm run check --workspace=diagnostics` and `git diff --check` passed. Browser
checks in ChatGPT in-app browser (2026-11-18; layout viewport 1113 × 1527 CSS
px at DPR 1.5) confirmed the environment summary and raw values, renderer
measurements after switching screens, fullscreen enter/exit, change-history
updates, and successful report copying. The browser allowed clipboard access
and provides `visualViewport`, so the denied-clipboard fallback and missing
optional-measurement state could not be exercised there; those fallback paths
remain pending browser verification. The Step 2 DPR 3 device-scale cap check
also remains pending.

### 4. Add WebGL status and frame timing

- [x] Replace the current throwing context startup path with visible readiness
  and failure states. Read WebGL details from the context the study actually
  uses. Report `drawingBufferWidth` and `drawingBufferHeight` separately from
  requested attributes. On `webglcontextlost`, allow restoration with
  `preventDefault()` and stop the workload sample. On restore recreate renderer
  resources for that context and redraw. Keep HTML and Generic mode usable
  when WebGL2 is unavailable.
- [x] Use the existing rotating Game study as the start/stop workload. Make
  backing scale adjustable on this screen. Sample consecutive timestamps from
  the animation loop that draws it. Calculate FPS as 1000 divided by mean
  interval in milliseconds. Use median and nearest-rank p95 from numeric sorted
  intervals. Display `Idle`, `Collecting`, or the results. Require at least
  2000 ms and 30 intervals before publishing results. Keep a bounded sample
  that can reach both thresholds and throttle HTML updates independently of
  canvas drawing.
- [x] Reset the sample when workload or drawing buffer size changes, the
  context is interrupted, or the page returns from being hidden. Clear the
  previous timestamp so no interval crosses the interruption. Stop drawing
  while hidden or on the other screen. Include the workload, actual drawing
  buffer and sample status in reports. Keep optional renderer identifiers out
  of the default report.

**Checkpoint.** Run the workload at two backing scales. Observe a fresh
Collecting state after the change and after returning from a hidden tab. Stop
the workload and verify Idle. With WebGL2 unavailable, use the Generic canvas
and report. If supported, exercise loss and restoration on the active context.

**Step 4 results (2026-11-18).** Added visible WebGL2 startup, ready, lost, and
unavailable states; context attributes, version, viewport, limits, extensions,
and shader precision details; actual drawing-buffer dimensions separate from
canvas attributes; and context loss/restoration handling that recreates the
public renderer and redraws. The animated Game study now has explicit
start/stop controls and selectable backing scale. Browser frame intervals are
sampled from the drawing loop, with mean-based FPS, median and nearest-rank p95;
results publish after 2 seconds and 30 intervals. Samples reset on workload,
buffer-size, visibility, screen, and context interruptions. Drawing pauses when
the page is hidden or the other screen is active. WebGL and timing details are
included in both screen reports; optional vendor and renderer identifiers are
omitted.

`npm run check --workspace=diagnostics`, `npm run build --workspace=diagnostics`,
and `git diff --check` passed. Browser checks in ChatGPT in-app browser
(2026-11-18) confirmed WebGL2 readiness and a
1200 × 900 drawing buffer, a fresh sample after changing to 3× (2400 × 1800),
and published results after 2001 ms / 103 intervals (51.5 FPS in that run).
Switching to Canvas & Environment stopped drawing; returning started a fresh
sample. Stopping to confirm Idle, hidden-tab return, WebGL2 unavailable, and
context loss/restoration remain pending browser verification.

### 5. Finish input parity and verify the release paths

- [x] Keep native controls as the mouse, touch and keyboard path. The resize
  handle also supports keyboard arrow adjustment.
- [x] Add a standard-mapped gamepad poll that navigates visible, enabled
  controls in DOM order. It uses a 0.25 stick dead zone, held-direction repeat,
  one action per A/B/shoulder press, and explicit numeric and select edit modes.
  Numeric editing uses fine left/right and coarse up/down steps, with A to
  accept and B to cancel. Focused controls scroll into view; closing a detail
  returns focus to its summary.
- [x] Add Controls help and clear held gamepad input after disconnect or focus
  loss. The shared control handlers serve native and gamepad selections.
- [ ] Verify all controls with a physical standard-mapped gamepad and a touch
  device. These are not available in the current environment.
- [x] Run workspace, diagnostics, and Pages builds; add focused sizing and
  timing regression tests; update the app and root READMEs; and reconcile the
  old overlay description in the spec index.
- [ ] Complete the remaining browser and release-path checks listed below.

**Step 5 results (2026-11-19).** Added a separate gamepad poll with DOM-order
focus navigation, neutral dead zone, direction repeat, standard A/B and
shoulder mappings, numeric and native-select edit modes, explicit accept and
cancel, focus scrolling, and an accessible status line. Added shared Controls
help, Escape handling for gamepad edits, open details and fullscreen, and
keyboard resizing on the calibration handle. Added sizing and frame-timing
tests. Local browser checks (ChatGPT in-app browser, 2026-11-19) confirmed the
help disclosure and Escape close/focus behavior, keyboard canvas-width change,
Generic mode, 16:9 and Stretch choices, and screen navigation. The root-based
Pages preview opened `/test-card/` on the Test Card study. `npm run check`,
`npm run check --workspace=diagnostics`, `npm run build --workspace=diagnostics`,
`node --experimental-strip-types --test apps/diagnostics/tests/*.test.ts`,
`PAGES_BASE=/ npm run build:pages`, and
`PAGES_BASE=/one-more-glow/ npm run build:pages` passed. The project-base
artifact used assets under `/one-more-glow/test-card/`. `git diff --check`
passed. Physical gamepad and touch-device interaction, plus the pending browser
fallback and renderer interruption scenarios below, remain unverified.

## Verification

Automated build and focused test results are recorded under the completed
steps. The Step 2 DPR 3 device-scale cap check and Step 3 missing-API and
clipboard-denial fallbacks remain pending. Real controller and touch-device
checks remain pending. Browser checks for Step 4 Idle, hidden-tab return,
WebGL2 unavailable, and context loss/restoration also remain pending.
Record command results and the browser, device and controller used. Run from
the repository root:

```sh
npm run check
npm run build --workspace=diagnostics
PAGES_BASE=/one-more-glow/ npm run build:pages
```

Use the repository's Node test runner for focused regression checks on pure
functions. Follow the library's [test command](../../../../packages/one-more-glow/package.json)
and run the diagnostics cases with
`node --experimental-strip-types --test apps/diagnostics/tests/*.test.ts`.
Cover the Robots cap, fractional CSS-to-backing rounding, Fit versus Stretch,
and the timing thresholds and reset. The browser checkpoints cover DOM layout,
input and device events.

For a local Pages browser check, also build and serve the root-based artifact
using the [README commands](../../../../README.md#github-pages-site). Open
`/test-card/` with no query and check initial Test Card, both screens, and
offline navigation after the worker has installed. Inspect the project-base
artifact for asset URLs under `/one-more-glow/test-card/`.

Run the workbench spec's verification scenarios. Use a narrow touch device or
emulation for layout, then verify real pinch and gamepad input where available.
Record any hardware or browser checks the environment cannot perform as pending.

## Open questions

None that block implementation. Record any browser-specific gaps that affect
the accepted behaviour as they are discovered.

## Next action

Use a physical standard-mapped gamepad and touch device to verify the input
paths. Then complete the pending WebGL2, browser fallback, hidden-tab, and
offline service-worker scenarios. These hardware and browser conditions were
unavailable in the current verification environment.

## Completion criteria

- [ ] Both screens satisfy the accepted spec, including calibrating in each mode
  and completing all app-owned actions with each supported input.
- [ ] Existing studies, legacy links and the published Test Card entry pass
  their checkpoints. The workbench runs offline with local assets.
- [ ] Required checks and manual verification results are recorded. Any
  outstanding real-device coverage is explicitly identified.
- [ ] Durable documentation reflects the delivered behaviour and status.
