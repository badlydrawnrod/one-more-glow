# Architecture

## Repository layout

The repository is a small npm-workspaces monorepo. Root tooling and scripts
coordinate packages, but the root itself is not a publishable package.

```text
apps/
  diagnostics/              # Vite app for checking library rendering
  asteroids-demo/           # Vite app for keyboard/gamepad spacecraft flight
  gyruss-demo/              # Vite app for a keyboard/gamepad orbital shooter
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

App-specific specifications and practical documentation live with the app, in
`SPEC.md` and `README.md` when needed. App-specific active plans live under the
app's `plans/active/`; shared and cross-app plans live under the root `plans/`.

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

### Asteroids demo

`apps/asteroids-demo/`

An independent consumer of the library package. It demonstrates a simple
Asteroids-style flight model with keyboard and browser Gamepad API input. Input
handling and game state belong to this app; it must use the public package
entry point rather than library internals.

### Gyruss demo

`apps/gyruss-demo/`

An independent consumer of the library. It demonstrates a simple orbital
shooter with keyboard and browser Gamepad API input. Input handling and game
state belong to this app; it must use the public package entry point rather
than library internals.

## Dependency direction

```text
apps/diagnostics   apps/asteroids-demo   apps/gyruss-demo
       |                    |                   |
       +--------------------+-------------------+
                            v
             one-more-glow public entry point
                            |
                            v
             DrawingContext <--- WebGL2 renderer
```

The renderer implements the shared contract. Future renderers should also
implement that contract independently and must not depend on other renderer
implementations. Sharing an interface does not imply sharing implementation
machinery.

## Evolution

Keep the repository layout small. Add packages when a real reusable boundary
appears; do not create a shared package or general-purpose framework
speculatively. Record deliberate architectural changes here.
