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

`Color` is RGB with each component in the range 0–1. Intensity is also in the range 0–1. Values outside those ranges are clamped. Colour and intensity are separate state: colour selects chromatic properties, while intensity controls relative brightness.

### Frame and pen behavior

**Status: Accepted**

**Implementation: Implemented**

There is one `beginFrame()` and one `endFrame()` per display refresh. `beginFrame()` clears the current frame and resets the drawing position. Drawing state such as colour and intensity remains in effect until changed. A `lineTo()` issued before any `moveTo()` in the frame draws nothing. Each successful `lineTo()` advances the current position; `point()` does not.

Lifecycle misuse (including nested, repeated or out-of-frame calls) is currently undefined and is not required to be detected.

The Canvas renderer draws commands as they are issued. The WebGL2 renderer collects commands and submits them at `endFrame()`. This batching strategy is an implementation detail; a particular command-buffer representation is not part of the public contract.

## Display character

**Status: Accepted at the level of intent; specific effects below are deferred or proposed**

The display should give vector geometry a distinctive luminous character. Colour and intensity belong to drawing descriptions, while display effects belong to renderer presentation. A predominantly dark background is appropriate for the diagnostic and intended aesthetic.

### Deferred effects

**Status: Deferred**

The following effects are intentionally outside the current implementation slice:

- Coloured halos or bloom
- Additive-looking illumination
- Phosphor-like persistence
- Adjustable beam width and a defined bright line core

Persistence is conceptually separate from frame submission. Beginning a frame must not implicitly specify how previous images fade. Persistence should be off by default if introduced. The exact appearance and controls for these effects remain open until their behavior is designed.

### Current backend behavior

**Implementation: Implemented**

Canvas 2D uses opacity for intensity and draws thin lines and small points. WebGL2 uses alpha blending, shader-expanded line and point quads, and per-frame batching. Pixel-identical output is not required; equivalent drawing meaning and ordering are required.

## Deferred and proposed capabilities

These capabilities are not part of the current accepted drawing contract. Their inclusion, API shape and detailed behavior remain open unless stated otherwise.

### Derived geometry

**Status: Proposed**

Polylines, closed polygons, circles, arcs and other convenience geometry may be useful. If added, they should normally be small utilities composed from the fundamental operations rather than additions to the renderer contract. Curves could be approximated by line segments. Filled geometry is not currently required; consider it if consumers demonstrate a need.

### Transformations

**Status: Deferred**

Translation, rotation, scaling and a push/pop transformation stack have not been designed or accepted as part of the public API. If transformations are pursued, their coordinate model, composition order and relationship to drawing state must be decided and tested consistently across renderers. Avoid general-purpose matrix dependencies without a concrete need.

### Logical coordinates and viewport

**Status: Proposed**

Drawing in configurable logical coordinates independent of physical canvas resolution may be useful. No logical resolution, scaling, aspect-ratio or clipping contract is currently accepted. Resolve these semantics before requiring backends to implement them.

### Vector text

**Status: Deferred**

Vector text may be useful, potentially through a small stroke font composed from normal drawing operations and without browser font rendering. Font coverage, alignment and other text behavior are undecided. Text is not part of the current contract.

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

Testing conventions are maintained in `docs/engineering.md`. Tests should focus on observable behavior at the shared public contract; backend tests may verify renderer-specific invariants when those are necessary to preserve the contract.

The accepted drawing contract and both backends are implemented. Automated tests cover frame clearing and pen behavior in Canvas, plus WebGL2 frame batching, command ordering and per-command style snapshots. Deferred and proposed capabilities above are not implemented requirements.
