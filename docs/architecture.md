# Architecture

## Overview

One More Glow provides a renderer-independent API for immediate-mode, 2D vector drawing.

The library currently has two renderer implementations:

- Canvas 2D
- WebGL2

Both implement the same `DrawingContext` interface.

The WebGL2 implementation batches drawing operations and represents line segments as quads.

## Components

### Graphics contract

`src/graphics.ts`

Defines shared public drawing types and interfaces.

Must not depend on renderer implementations or application code.

### Viewport mapping

`src/viewport.ts`

Maps the accepted logical display coordinates to output coordinates and derives the backing-store scale for CSS-pixel beam dimensions. It is a small renderer-independent calculation and must not use browser graphics APIs.

### Canvas renderer

`src/canvas-renderer.ts`

Implements the drawing contract using Canvas 2D.

May depend on the graphics contract.

Must not depend on the WebGL2 implementation.

### WebGL2 renderer

`src/webgl2-renderer.ts`

Implements the drawing contract using WebGL2.

May depend on the graphics contract.

Must not depend on the Canvas implementation.

### Public entry point

`src/index.ts`

Defines the supported public library exports.

Internal implementation details should not be exported unnecessarily.

### Development application

`src/main.ts`

A diagnostic and development consumer of the library.

Must use the public library API rather than renderer internals.

## Dependency direction

```text
     Development application
               |
        Public library API
               |
       DrawingContext
          /         \
     Canvas 2D     WebGL2
```

The two renderers are independent implementations of one contract.

Sharing an interface does not imply sharing internal implementation machinery.

## Architectural constraints

1. The graphics contract must remain independent of Canvas and WebGL2.
2. Neither renderer may depend on the other.
3. Application-specific behaviour must not enter the library.
4. Renderer-specific resources and optimisations belong inside their implementations.
5. The public API must not expose renderer-specific implementation details.
6. New modules should have one clear responsibility.

## Evolution

Keep the repository layout flat while the codebase remains small.

Introduce subdirectories when distinct components emerge with meaningful internal structure.

Avoid creating a general-purpose game engine.

Architectural changes should be deliberate and reflected in this document.
