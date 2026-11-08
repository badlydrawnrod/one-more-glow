# One More Glow — Vector Display Specification

This specification records accepted intent, deferred capabilities, proposals and implementation status separately. A capability marked deferred or proposed is not an instruction to implement it.

## Purpose and guiding principles

**Status: Accepted**

One More Glow is a small TypeScript library for drawing retro-inspired 2D vector graphics with a luminous character. Its visual inspiration includes classic vector arcade machines and modern interpretations. The guiding fiction is an imaginary late-1980s colour vector console, provisionally called **OMG-1**; accurate hardware emulation is not a goal.

The library provides a small, coherent drawing vocabulary for games and other consumers. It is not a game engine. Consumers own game state, timing, input, physics, audio and animation. The library owns vector drawing and its presentation.

Prefer a small, understandable contract and explicit dependencies. Avoid unnecessary abstractions, dependencies and runtime overhead.

## Architecture

**Status: Accepted**

**Implementation: Implemented**

The library has a renderer-independent drawing contract and a current WebGL2 implementation. The public contract must not expose graphics API types. Backend setup, resource ownership and internal rendering techniques may differ, while drawing commands retain equivalent geometry, colour, intensity and ordering semantics. The `DrawingContext` contract is the stable boundary for future renderers, such as WebGPU, and adding one should not require consumer drawing code to change.

The core must not depend on either renderer or browser graphics APIs. The development diagnostic is a consumer of the public library API and must not depend on renderer internals.

## Drawing contract

**Status: Accepted**

**Implementation: Implemented**

The library uses immediate-mode drawing. Consumers submit drawing commands between frame boundaries; the library does not retain game objects or own their behavior.

The accepted fundamental operations are:

| Operation | Meaning |
|---|---|
| `beginFrame()` | Begin a frame and clear/reset its submitted drawing |
| `endFrame()` | Finish submitting the frame for presentation |
| `setColor(color)` | Select the RGB drawing colour |
| `setIntensity(value)` | Select relative beam intensity |
| `moveTo(x, y)` | Set the current drawing position without drawing |
| `lineTo(x, y)` | Draw from the current position and advance it |
| `point(x, y)` | Draw a point without changing the current position |

`Color` is RGB with each component in the range 0–1. Intensity is also in the range 0–1. Values outside those ranges are clamped.

Colour and intensity are separate drawing state. Colour selects chromatic properties, while intensity controls relative brightness.

Intensity describes illumination, not necessarily transparency. The current renderer uses alpha-based techniques, but that implementation choice does not define the enduring meaning of intensity.

### Frame and pen behavior

**Status: Accepted**

**Implementation: Implemented**

There is one `beginFrame()` and one `endFrame()` per display refresh. `beginFrame()` clears the current frame and resets the drawing position. Drawing state such as colour and intensity remains in effect until changed.

A `lineTo()` issued before any `moveTo()` in the frame draws nothing. Each successful `lineTo()` advances the current position; `point()` does not.

Lifecycle misuse (including nested, repeated or out-of-frame calls) is currently undefined and is not required to be detected.

The WebGL2 renderer collects commands and submits them at `endFrame()`. This batching strategy is an implementation detail; a particular command-buffer representation is not part of the public contract.

Clearing the current frame is distinct from any future phosphor-persistence effect. Frame submission describes the current drawing; persistence, if implemented, determines how illumination from previous frames contributes to the presented image.

## Display character

**Status: Accepted at the level of intent; individual characteristics and effects have statuses below**

One More Glow represents the display of an imaginary colour vector arcade machine. Its visual character should evoke a luminous vector monitor rather than conventional raster graphics.

Three concepts are distinguished:

- **Geometry** describes what is drawn.
- **Beam characteristics** describe the illumination associated with that geometry.
- **Display effects** describe how illumination is presented and how it changes over time.

The library should preserve these distinctions without attempting to simulate the physical electronics of a real vector monitor.

The intended visual character includes:

- Bright, sharply defined vector geometry against a predominantly dark background.
- Coloured illumination with a bright central core and softer surrounding glow.
- Variable intensity, allowing some geometry to appear brighter than other geometry.
- Consistent visual treatment of points, lines and connected paths.
- Optional phosphor-like persistence, allowing recently drawn geometry to fade gradually.

These characteristics establish the intended aesthetic. They do not require every effect to be implemented immediately.

### Beam characteristics

**Status: Colour, intensity, beam width, bright core and halo accepted and implemented; global display-profile configuration accepted, API pending; light accumulation deferred**

A beam is the conceptual source of illumination for vector geometry.

| Characteristic | Intended behaviour | Status |
|---|---|---|
| Colour | Illuminate geometry using its specified RGB colour. | Implemented |
| Intensity | Control relative illumination independently of colour. | Implemented |
| Beam width | Control the apparent thickness of the luminous core. | Accepted and implemented |
| Bright core | Give lines and points a sharply defined, bright centre that moves toward white as intensity rises. | Accepted and implemented |
| Halo / bloom | Produce a broad, soft coloured glow surrounding illuminated geometry. | Accepted and implemented |
| Light accumulation | Allow overlapping illumination to appear brighter, subject to defined compositing semantics. | Deferred |

Beam width and intensity are distinct concepts. Increasing intensity should not implicitly change geometric line width. An apparent widening caused by brighter bloom is a display effect rather than a change in geometry.

Colour and intensity belong to drawing descriptions. Beam width and display effects such as bloom are global display-profile settings, not per-command drawing state. The current renderer uses a fixed profile; public configuration is not implemented yet.

A bright core and its surrounding halo are aspects of the same illuminated geometry. Consumers should not need to submit additional decorative geometry to reproduce these effects.

The bright core and halo are one presentation treatment. Higher intensity moves the core toward white while preserving the selected colour in the surrounding halo. Line endpoints retain some halo without prominent flares; points have a more restrained halo than lines. The current renderer uses a fixed internal profile rather than public controls. Its dimensions and falloff values are adjustable later if visual feedback warrants it; they are starting settings, not permanent limits.

### Baseline beam

**Status:** Accepted
**Implementation:** Implemented in WebGL2.

- Lines have a visually continuous, sharply defined core.
- Points have a consistent, recognisably luminous appearance.
- Corners and endpoints should not exhibit unintended gaps or obvious rendering artefacts.
- Colour and intensity produce perceptibly distinct results without relying on bloom.

The accepted baseline uses a 1.5-pixel line core with rounded ends and circular points with a 1.5-pixel radius. These dimensions are the current fixed renderer profile and may be adjusted later if visual feedback indicates a need.

### Display effects

**Status: Bloom accepted and implemented; global configuration of the display profile accepted, API pending; other effects deferred**

Display effects determine how beam illumination appears on screen. They are conceptually separate from drawing commands and game state.

#### Global display-profile options

**Status: Accepted**
**Implementation: The renderer uses a fixed internal profile; public options are not implemented.**

The renderer should accept global display-profile options that apply consistently to all drawing commands. Beam width and bloom/glow are accepted examples of configurable characteristics. A consumer may expose these settings as player-facing controls; the library provides the configuration, not the user interface.

These options belong to renderer or display configuration, not to `DrawingContext` drawing state. Exact option names, units, ranges, defaults, which additional characteristics are configurable, and whether settings can be changed after renderer creation remain open decisions.

#### Bloom

Bloom produces a broad, soft coloured halo around illuminated geometry, paired with a sharply defined core. Consumers do not submit separate geometry for either part.

The result should retain a recognisable, sharply defined core rather than simply blurring the entire image.

The current profile is fixed inside the WebGL2 renderer and preserves the submitted colour in the halo. Consumers do not configure bloom yet. The implementation may be tuned later without changing the accepted visual intent.

#### Light accumulation

Overlapping illuminated geometry may produce an additive-looking increase in brightness.

This differs conceptually from conventional transparency blending. The intended compositing semantics, colour interaction and saturation behaviour have not yet been decided.

A genuinely additive blending implementation is not currently required.

#### Phosphor persistence

Persistence allows illumination from previous frames to remain visible and decay over time.

Persistence is a property of display presentation, not drawing commands or game state. It must not change the meaning of submitted geometry.

Beginning a new frame must not implicitly specify how previous illumination fades. Clearing the current frame's drawing does not necessarily require clearing the display's accumulated illumination.

If introduced, persistence must be optional and disabled by default.

The decay model, timing, treatment of colour and intensity, and configuration remain undecided.

### Renderer responsibilities

**Status: Accepted**

The WebGL2 renderer implements the shared drawing contract. Any future renderer
must preserve its semantics.

The current renderer and any future renderers must preserve:

- Drawing primitive semantics.
- Geometry, colour and intensity.
- Drawing order must be preserved. The current alpha-based blending is an implementation baseline, not a permanent compositing contract. Semantics for overlapping illuminated geometry remain undecided.
- The distinction between drawing descriptions and display presentation.

Pixel-identical output is not required. Differences in antialiasing, rasterisation and other backend-specific rendering details are acceptable.

As display effects are introduced, they should have backend-independent semantics wherever practical. An effect should not acquire a different meaning solely because a different backend implements it.

The public drawing API must not expose backend-specific rendering techniques.

Display effects should not require consumers to submit additional geometry to simulate the appearance of a luminous beam.

### Current backend behavior

**Implementation: Implemented**

WebGL2 uses alpha blending, shader-expanded line and point quads with matching dimensions, and per-frame batching.

The Vite diagnostic uses WebGL2 and defaults to a static game-like scene combining a sparse neon grid and geometric enemies with a transformed side-on craft, terrain, fuel pod and tractor beam. Add `?animate=1` to rotate the craft continuously in the game scene. Use `?scene=testcard` to inspect the focused geometry, transform and intensity examples: open paths and closed outlines in colour-coded ladders, a row of locally defined crafts at different positions, rotations and scales, a central line/triangle/point study, line and point samples, circles, ellipses, circular and elliptical arcs, and nested rectangles.

The WebGL2 shader combines inner and outer falloff, uses separate line and point halo strengths, and tapers line halos near their endpoints. The numeric profile remains adjustable if later visual feedback warrants it. Future backends should implement the same accepted appearance without requiring pixel-identical output.

### Display design constraints

**Status: Accepted**

- Preserve the distinction between geometry, beam characteristics and display effects.
- Keep rendering techniques internal to each backend.
- Do not introduce physical beam simulation as a prerequisite for luminous rendering.
- Introduce effects independently where practical, allowing their visual behaviour to be evaluated before combining them.
- Prefer a small, coherent set of controls over exposing every implementation parameter.
- Do not require a scene graph, retained game-object model or other game-engine abstractions to implement display effects.

The intended result is a distinctive, consistent vector-display aesthetic, not a general-purpose graphics effects framework.

## Deferred and proposed capabilities

These capabilities are not part of the current accepted drawing contract. Their inclusion, API shape and detailed behavior remain open unless stated otherwise.

### Derived geometry

**Status: Open polylines, polygon outlines, circles, ellipses and arcs accepted and implemented; other derived geometry deferred**

The accepted helpers, their semantics and their current implementation status are defined in the [Derived Geometry Specification](derived-geometry.md). Other curves and filled geometry remain outside the accepted scope until their behavior is defined and a concrete consumer need is established.

### Transformations

**Status: Accepted and implemented**

Translation, rotation, scaling and a push/pop transformation stack are accepted
for the public drawing contract. Their coordinate system, composition order,
frame behavior and relationship to beam sizing are defined in the
[Transformation Specification](transformations.md). The specification does
not require a public matrix type or a general-purpose matrix dependency.

### Logical coordinates and viewport

**Status: Accepted**

**Implementation: Implemented**

The logical mapping and beam sizing have been visually confirmed in WebGL2, in both landscape and portrait orientations.

The imaginary console should provide fixed logical coordinate spaces for landscape 4:3 and portrait 3:4 displays. Consumers use the selected console space rather than choosing their own logical dimensions. The origin is at the centre, positive X points right, and positive Y points up.

**Accepted decision:** The long axis spans `-512` to `+512`; the short axis spans `-384` to `+384`. This gives logical extents of 1024 × 768 units in landscape and 768 × 1024 units in portrait. Coordinates may be fractional; these extents do not prescribe a raster resolution.

Map the selected logical space to the physical canvas with uniform scaling, preserving geometry proportions and letterboxing unused canvas space as needed. The mapping affects geometry position and dimensions while preserving the current apparent screen-space beam profile. In particular, scaling logical geometry must not scale the beam core width, point radius or halo size: these remain measured in CSS pixels.

**Accepted decision:** The host sizes the canvas to the selected console aspect ratio and letterboxes the canvas within the page as needed. The renderer does not draw page letterboxing; any halo beyond the canvas is naturally not presented.

**Accepted decision:** Geometry and its halo are clipped at the logical display bounds. Since those bounds map to the output surface edges, the renderer surface provides this clipping; no separate logical clipping pass is required.

**Accepted decision:** Consumers select landscape or portrait orientation when configuring a renderer. Landscape is the default.

**Accepted decision:** Drawing coordinates may lie outside the logical extents. Geometry is rendered normally and the portion beyond the display bounds is clipped by the canvas surface.

**Accepted decision:** Beam dimensions are measured in CSS pixels. The canvas backing resolution accounts for device-pixel ratio, and renderers scale the beam profile accordingly so its apparent size remains stable across display densities.

### Vector text

**Status: Deferred**

Vector text may be useful, potentially through a small stroke font composed from normal drawing operations and without browser font rendering.

Such text would inherit the same colour, intensity and display characteristics as other vector geometry.

Font coverage, alignment and other text behavior are undecided. Text is not part of the current contract.

## Non-goals

**Status: Accepted**

One More Glow is not intended to provide:

- An entity-component system, scene graph or game loop
- Physics, collision detection, input handling, audio, animation or game state
- Sprite or texture-based game rendering
- A general-purpose UI framework or full 3D renderer
- Accurate analogue vector-display hardware emulation

These responsibilities belong to consumers or separate utilities.

## Testing and implementation status

Testing conventions are maintained in `docs/engineering.md`.

Tests should focus on observable behavior at the shared public contract; backend tests may verify renderer-specific invariants when those are necessary to preserve the contract.

The accepted drawing contract, WebGL2 renderer and accepted derived geometry helpers are implemented. Automated tests cover polyline and polygon helper semantics, circle, ellipse and arc tessellation, angle direction and endpoints, invalid-radius no-ops, WebGL2 frame clearing, pen behavior, frame batching, command ordering, per-command style snapshots and halo profile invariants.

Proposed capabilities above remain subject to evaluation even when an experimental implementation is present. Deferred capabilities are not implemented requirements.

As display characteristics and effects become accepted, their externally observable semantics should be specified and tested consistently across backends. Visual appearance may additionally require diagnostic examples or visual comparisons, without imposing pixel-identical output.

The development diagnostic should support evaluating proposed display characteristics before their behaviour and controls are finalised.
