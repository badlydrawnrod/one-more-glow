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

The library has a renderer-independent drawing contract and interchangeable Canvas 2D and WebGL2 implementations. The public contract must not expose Canvas or WebGL types. Backend setup, resource ownership and internal rendering techniques may differ, while drawing commands retain equivalent geometry, colour, intensity and ordering semantics.

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

Intensity describes illumination, not necessarily transparency. The current renderers use alpha-based techniques, but those implementation choices do not define the enduring meaning of intensity.

### Frame and pen behavior

**Status: Accepted**

**Implementation: Implemented**

There is one `beginFrame()` and one `endFrame()` per display refresh. `beginFrame()` clears the current frame and resets the drawing position. Drawing state such as colour and intensity remains in effect until changed.

A `lineTo()` issued before any `moveTo()` in the frame draws nothing. Each successful `lineTo()` advances the current position; `point()` does not.

Lifecycle misuse (including nested, repeated or out-of-frame calls) is currently undefined and is not required to be detected.

The Canvas renderer draws commands as they are issued. The WebGL2 renderer collects commands and submits them at `endFrame()`. This batching strategy is an implementation detail; a particular command-buffer representation is not part of the public contract.

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

**Status: Colour and intensity accepted and implemented; other characteristics proposed or deferred**

A beam is the conceptual source of illumination for vector geometry.

| Characteristic | Intended behaviour | Status |
|---|---|---|
| Colour | Illuminate geometry using its specified RGB colour. | Implemented |
| Intensity | Control relative illumination independently of colour. | Implemented |
| Beam width | Control the apparent thickness of the luminous core. | Proposed |
| Bright core | Give lines and points a sharply defined, bright centre. | Proposed |
| Halo / bloom | Produce a soft coloured glow surrounding illuminated geometry. | Deferred |
| Light accumulation | Allow overlapping illumination to appear brighter, subject to defined compositing semantics. | Deferred |

Beam width and intensity are distinct concepts. Increasing intensity should not implicitly change geometric line width. An apparent widening caused by brighter bloom is a display effect rather than a change in geometry.

Colour and intensity belong to drawing descriptions. Whether beam width belongs to drawing state, display configuration, or both remains undecided.

A bright core and its surrounding halo are aspects of the same illuminated geometry. Consumers should not need to submit additional decorative geometry to reproduce these effects.

The exact appearance, configuration and interaction of these characteristics remain open until their behaviour is designed.

### Baseline beam

**Status:** Accepted
**Implementation:** Implemented and visually compared in Canvas 2D and WebGL2

- Lines have a visually continuous, sharply defined core.
- Points have a consistent, recognisably luminous appearance.
- Corners and endpoints should not exhibit unintended gaps or obvious rendering artefacts.
- Colour and intensity produce perceptibly distinct results without relying on bloom.

The accepted baseline uses a 1.5-pixel line core with rounded ends and circular points with a 1.5-pixel radius. These dimensions may be revisited if later visual feedback indicates a need to adjust them.

### Display effects

**Status: Deferred**

Display effects determine how beam illumination appears on screen. They are conceptually separate from drawing commands and game state.

#### Bloom

Bloom produces a soft coloured halo around illuminated geometry.

The result should retain a recognisable, sharply defined core rather than simply blurring the entire image.

The relationship between beam intensity, beam width, bloom strength and colour remains to be designed.

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

Canvas 2D and WebGL2 implement the same drawing contract.

Both backends must preserve:

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

Canvas 2D uses opacity for intensity, a 1.5-pixel rounded line stroke, and circular points with a 1.5-pixel radius.

WebGL2 uses alpha blending, shader-expanded line and point quads with matching dimensions, and per-frame batching.

The Vite diagnostic includes connected shapes, separate endpoints, points and repeated line/point examples at three intensity levels. Use `?renderer=canvas` to compare Canvas 2D with WebGL2. Initial screenshot review found the two backends closely matched at the displayed scale, with no conspicuous gaps; point visibility remains a visual choice for further feedback.

These implementations establish the baseline drawing behaviour. They do not yet implement the full intended luminous display character.

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

**Status: Proposed**

Polylines, closed polygons, circles, arcs and other convenience geometry may be useful.

If added, they should normally be small utilities composed from the fundamental operations rather than additions to the renderer contract.

Curves could be approximated by line segments. Filled geometry is not currently required; consider it if consumers demonstrate a need.

Derived geometry should retain the same drawing and beam semantics as the underlying primitives.

### Transformations

**Status: Deferred**

Translation, rotation, scaling and a push/pop transformation stack have not been designed or accepted as part of the public API.

If transformations are pursued, their coordinate model, composition order and relationship to drawing state must be decided and tested consistently across renderers.

Avoid general-purpose matrix dependencies without a concrete need.

### Logical coordinates and viewport

**Status: Proposed**

Drawing in configurable logical coordinates independent of physical canvas resolution may be useful.

No logical resolution, scaling, aspect-ratio or clipping contract is currently accepted.

Resolve these semantics before requiring backends to implement them.

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

The accepted drawing contract and both backends are implemented. Automated tests cover frame clearing and pen behavior in Canvas, plus WebGL2 frame batching, command ordering and per-command style snapshots.

Deferred and proposed capabilities above are not implemented requirements.

As display characteristics and effects become accepted, their externally observable semantics should be specified and tested consistently across backends. Visual appearance may additionally require diagnostic examples or visual comparisons, without imposing pixel-identical output.

The development diagnostic should support evaluating proposed display characteristics before their behaviour and controls are finalised.
