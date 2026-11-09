# Architecture

## Repository layout

The repository is a small npm-workspaces monorepo. Root tooling and scripts
coordinate packages, but the root itself is not a publishable package.

```text
apps/
  diagnostics/              # Vite app for checking library rendering
packages/
  one-more-glow/            # reusable drawing library
docs/
  specs/                    # durable behavior requirements
```

Reusable libraries live under `packages/`; runnable consumers live under
`apps/`. Apps depend on packages through their public package names and
exports. Packages must not depend on apps. Code specific to one app should
remain in that app. Create a shared package when a concrete reusable boundary
emerges, rather than in anticipation of hypothetical reuse.

The root `package.json` declares npm workspaces and the commands documented in
the root README. Each workspace owns its package manifest and local build
configuration. The root package remains private; each library package is the
boundary that may be published independently in the future.

## Library overview

One More Glow provides a renderer-independent API for immediate-mode, 2D vector
drawing. The library currently has one renderer implementation: WebGL2. It
implements the shared `DrawingContext` interface, which remains the stable
boundary for future renderers such as WebGPU. Adding a renderer should not
require consumers to change their drawing code.

The WebGL2 implementation batches drawing operations and represents line
segments as quads.

## Components

### Graphics contract

`packages/one-more-glow/src/graphics.ts`

Defines shared public drawing types and interfaces. Must not depend on renderer
implementations, browser graphics APIs, or application code.

### Viewport mapping

`packages/one-more-glow/src/viewport.ts`

Maps accepted logical display coordinates to output coordinates and derives
the backing-store scale for CSS-pixel beam dimensions. It is renderer
independent and must not use browser graphics APIs.

### WebGL2 renderer

`packages/one-more-glow/src/webgl2-renderer.ts`

Implements the drawing contract using WebGL2. May depend on the graphics
contract, but must not depend on another renderer implementation.

### Public entry point

`packages/one-more-glow/src/index.ts`

Defines the single supported public library entry point. It exports the shared
drawing API, derived geometry helpers and current WebGL2 renderer. Keep
implementation details private unless there is a deliberate API decision to
expose them.

### Diagnostics app

`apps/diagnostics/`

An independent consumer of the library package. It provides test-card and
sample-scene views for checking rendering and exploring display behavior. It
must import the library by package name through the public entry point, not
from library source or renderer internals.

## Dependency direction

```text
apps/diagnostics
       |
       v
packages/one-more-glow public entry point
       |
       v
    DrawingContext <--- WebGL2 renderer
```

The renderer implements the shared contract. Future renderers should also
implement that contract independently and must not depend on other renderer
implementations. Sharing an interface does not imply sharing implementation
machinery.

## Architectural constraints

1. The graphics contract must remain independent of browser graphics APIs and renderer implementations.
2. Renderer implementations must not depend on one another.
3. Application-specific behavior must not enter reusable library packages.
4. Renderer-specific resources and optimizations belong inside their implementations.
5. The public API must not expose renderer-specific implementation details beyond deliberate renderer construction APIs.
6. Apps consume packages through declared dependencies and public exports.
7. New packages should represent meaningful reusable boundaries, not just shorter source files.

## Evolution

Keep the repository layout small while the codebase remains small. Add workspace
packages when a real library or application boundary appears. Avoid creating a
general-purpose game engine, task orchestrator, or shared package speculatively.

Architectural changes should be deliberate and reflected in this document.
