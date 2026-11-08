# Architecture

## Overview

One More Glow provides a renderer-independent API for immediate-mode, 2D vector drawing.

The library currently has one renderer implementation: WebGL2. It implements the
shared `DrawingContext` interface, which remains the stable boundary for future
renderers such as WebGPU. Adding a renderer should not require consumers to
change their drawing code.

The WebGL2 implementation batches drawing operations and represents line
segments as quads.

## Components

### Graphics contract

`src/graphics.ts`

Defines shared public drawing types and interfaces.

Must not depend on renderer implementations or application code.

### Viewport mapping

`src/viewport.ts`

Maps the accepted logical display coordinates to output coordinates and derives the backing-store scale for CSS-pixel beam dimensions. It is a small renderer-independent calculation and must not use browser graphics APIs.

### WebGL2 renderer

`src/webgl2-renderer.ts`

Implements the drawing contract using WebGL2.

May depend on the graphics contract.

Must not depend on another renderer implementation.

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
             |
           WebGL2
```

The current renderer depends on the shared contract. Future renderers should
also implement that contract independently and must not depend on other
renderer implementations. Sharing an interface does not imply sharing
implementation machinery.

## Architectural constraints

1. The graphics contract must remain independent of browser graphics APIs and renderer implementations.
2. Renderer implementations must not depend on one another.
3. Application-specific behaviour must not enter the library.
4. Renderer-specific resources and optimisations belong inside their implementations.
5. The public API must not expose renderer-specific implementation details.
6. New modules should have one clear responsibility.

## Evolution

Keep the repository layout flat while the codebase remains small.

Introduce subdirectories when distinct components emerge with meaningful internal structure.

Avoid creating a general-purpose game engine.

Architectural changes should be deliberate and reflected in this document.
