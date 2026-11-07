# One More Glow — Vector Display Specification

**Status:** Initial design

## 1. Purpose

One More Glow is a lightweight TypeScript library for rendering luminous, vector-style 2D graphics.

Its visual inspiration includes classic vector arcade machines such as Asteroids, Tempest and the Vectrex, together with modern interpretations such as Geometry Wars.

The guiding concept is an imaginary late-1980s colour vector console, provisionally called **OMG-1**.

The objective is not to emulate historical hardware accurately. It is to provide a small, coherent drawing vocabulary with a distinctive aesthetic.

The library should be suitable for building multiple arcade-style games without becoming a general-purpose game engine.

## 2. Design goals

The library should:

1. Expose a small, renderer-independent drawing API.
2. Support both Canvas 2D and WebGL2 implementations.
3. Represent graphics primarily as points, lines and paths.
4. Support colour, beam intensity and geometric transformations.
5. Provide the foundation for glowing beams and phosphor-like persistence.
6. Keep rendering separate from game logic.
7. Be straightforward to understand, test and extend.
8. Avoid unnecessary dependencies and runtime overhead.

Simplicity is a design goal, not merely an implementation preference.

## 3. Architecture

The core defines the drawing contract and supporting data types.

Two rendering backends implement that contract:

- **Canvas 2D:** A straightforward reference implementation using `CanvasRenderingContext2D`.
- **WebGL2:** A GPU-based implementation intended to support more sophisticated luminous display effects.

Both backends must support the same fundamental drawing operations.

The public drawing API must not expose Canvas or WebGL2 types.

Backend-specific setup and resource ownership may differ, but clients should not need to change their drawing logic when switching backends.

An implementation may initially support only a subset of the intended visual effects. The essential requirement is consistent drawing semantics.

## 4. Drawing model

The library uses an immediate-mode drawing API.

A client begins a frame, issues drawing commands, and ends the frame.

The library is not a retained-mode scene graph. It does not own game objects or maintain their geometry between frames.

A frame describes what should be drawn, not how objects move or behave.

### 4.1 Fundamental primitives

The core drawing operations are:

| Operation | Meaning |
|---|---|
| `moveTo(x, y)` | Move the virtual drawing position without producing a visible line |
| `lineTo(x, y)` | Draw from the current position to the specified position |
| `point(x, y)` | Draw a luminous point |
| `setColor(color)` | Select the drawing colour |
| `setIntensity(value)` | Select beam intensity |

Paths are constructed from ordered drawing operations.

The distinction between moving without drawing and drawing a line is intentional. It preserves the conceptual model of a vector display with a moving beam.

The library does not initially simulate the timing or physical behaviour of an electron beam.

### 4.2 Derived primitives

Higher-level geometry may be implemented in terms of the fundamental operations:

- Polylines
- Closed polygons
- Circles
- Arcs
- Vector text

These operations should normally be implemented as small utilities rather than additions to the fundamental rendering contract.

Curves may be approximated by line segments.

Filled geometry is outside the initial core scope. It may be considered if actual games demonstrate a need.

### 4.3 Drawing state

Drawing state includes:

- Current position
- Colour
- Intensity
- Geometric transformation

Colour and intensity are distinct. A colour identifies the beam's chromatic properties; intensity expresses its relative brightness.

The initial design uses RGB colour and intensity values in the range 0 to 1.

Values outside supported ranges must have documented behaviour.

### 4.4 Geometric transformations

The library supports 2D transformations:

- Translation
- Rotation
- Scaling
- A push/pop transformation stack

Geometry is defined in logical display coordinates and transformed before rendering.

Transformation order and composition semantics must be explicitly documented and tested.

The initial implementation should avoid introducing general-purpose scene or matrix libraries unless there is a compelling need.

### 4.5 Coordinates and viewport

Drawing operations use logical coordinates independent of the physical canvas resolution.

The display has a defined logical width and height.

The renderer is responsible for mapping these coordinates into its output surface.

Viewport scaling, aspect-ratio handling and clipping must be consistent across implementations.

The logical resolution is configurable. No particular historical resolution is required.

## 5. Display appearance

The characteristic OMG appearance comes from how vector geometry is presented.

The intended visual features are:

- Thin, bright line cores
- Coloured halos or bloom
- Variable beam intensity
- Additive-looking illumination
- Optional phosphor-like persistence
- A predominantly dark background

These are primarily **display properties**, not game-object properties.

A game should describe its geometry and beam attributes without needing to know the details of bloom shaders or compositing passes.

### 5.1 Backend capabilities

Canvas 2D should prioritise correctness and simplicity.

WebGL2 may use multipass rendering, shaders and intermediate buffers to produce more sophisticated effects.

Pixel-identical results are not required.

The two implementations should preserve equivalent geometry, colours, drawing order and intensity semantics as far as their rendering capabilities allow.

### 5.2 Persistence

Phosphor persistence is conceptually separate from frame submission.

Beginning a frame clears or resets the current frame's drawing commands. It must not implicitly define how previous displayed images fade.

Persistence is an optional display effect controlled independently from game logic.

Persistence must be disabled by default during initial development to make results predictable.

## 6. Text

Vector lettering is part of the intended display vocabulary.

An initial text utility should use a simple stroke font expressed through the normal path operations.

Text should not require a browser font-rendering API.

Initial support may be limited to an appropriate ASCII subset.

Alignment, rotation and scaling can be added incrementally.

## 7. Rendering lifecycle

The conceptual rendering sequence is:

1. Initialise the display and renderer.
2. Begin a frame.
3. Submit drawing commands.
4. End the frame.
5. Present the resulting image.

The core contract defines frame boundaries but does not own the application's animation loop.

Games remain responsible for their own timing and state updates.

The implementation may batch commands internally.

No particular command-buffer representation is mandated initially.

## 8. Explicit non-goals

One More Glow is not intended to provide:

- An entity-component system
- A scene graph
- Physics or collision detection
- Input handling
- Audio management
- A game loop
- Animation or particle simulation
- Sprite or texture-based game rendering
- A general-purpose UI framework
- A full 3D renderer
- Accurate analogue vector-display hardware emulation

These capabilities belong to games, separate utilities or future projects if needed.

## 9. Testing

Test externally observable drawing behaviour through the shared public contract where practical.

Core tests should cover:

- Geometry construction
- Transformation semantics
- Drawing-state changes
- Frame lifecycle rules
- Expected command ordering

Backend tests should verify that each implementation honours the common contract.

The Canvas and WebGL2 backends should share behavioural test cases where appropriate.

Avoid testing private implementation details unless they enforce an important invariant.

Visual comparison tests may be introduced once the intended display appearance is established.

## 10. Initial development milestones

### Milestone 1 — Minimal drawing contract

Define the public drawing interface and simple geometry types.

Implement a Canvas 2D renderer supporting:

- Frame lifecycle
- Colour and intensity
- Points and lines
- Transformations

Create a diagnostic application that draws basic test patterns.

### Milestone 2 — WebGL2 backend

Implement the same public drawing contract using WebGL2.

Confirm that the existing diagnostic works without changing its drawing logic.

Optimise only as required by observed performance.

### Milestone 3 — Display character

Experiment with:

- Glowing line cores
- Bloom
- Beam width
- Additive illumination
- Persistence

Establish a coherent default appearance.

### Milestone 4 — Extended vocabulary

Introduce useful derived primitives such as circles, polygons and vector text.

Avoid promoting convenience functions into core rendering operations without justification.

## 11. Guiding principle

**Games describe vectors. The display makes them glow.**

The library should remain small enough that its architecture can be understood without extensive documentation.

When faced with competing designs, prefer the one that provides the necessary capability with fewer concepts, simpler contracts and less coupling.