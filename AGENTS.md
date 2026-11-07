# One More Glow — Agent Guidance

## Project

One More Glow (OMG) is a small TypeScript graphics library for creating games inspired by classic vector-display arcade machines.

The guiding fiction is a colour vector-based arcade console that might have existed in the late 1980s, but never did.

The library provides a coherent set of 2D drawing primitives and a luminous vector-display aesthetic. Games are consumers of the library, not part of it.

See `docs/specs/vector-display.md` for the intended capabilities and architectural boundaries.

## Engineering principles

- Prefer simple, understandable, conventional TypeScript.
- Build a small graphics library, **not a game engine**.
- Favour explicit dependencies and clear module boundaries.
- Prefer functions and simple data types over elaborate object hierarchies.
- Introduce abstractions only when they solve a demonstrated problem.
- Do not add dependencies without a concrete reason.
- Avoid frameworks, dependency injection containers, ECS architectures, scene graphs and plugin systems.
- Keep the public API small and independent of rendering technology.
- Prefer testable, deterministic behaviour at stable boundaries.
- Preserve existing behaviour when refactoring.

An abstraction shared by two implementations is not automatically a good abstraction. Prefer a small, meaningful contract over a comprehensive one.

## Architecture

The library has three conceptual parts:

1. **Core:** Backend-independent drawing contracts, geometry and related utilities.
2. **Canvas renderer:** An implementation using the browser Canvas 2D API.
3. **WebGL2 renderer:** An implementation using WebGL2, including the eventual luminous display effects.

Both renderers must implement the same public drawing contract.

The core must not depend on either renderer or on browser-specific graphics APIs.

Renderer implementations may use different internal techniques, but should agree on the documented meaning of drawing operations.

The development application is a consumer of the public library API. It must not be coupled to renderer internals.

## Scope

The library is responsible for drawing vector geometry and presenting it with a consistent visual character.

It is not responsible for game loops, physics, collision detection, input handling, entities, audio or game state.

A display diagnostic/demo is an appropriate consumer of the library.

## Development workflow

- Work incrementally, making small, understandable changes.
- Implement only what the current task requires.
- Keep the project compatible with the existing Vite and TypeScript setup.
- Use the repository's existing package manager and scripts.
- Avoid introducing build tools or runtime dependencies unnecessarily.
- Write tests for meaningful, externally observable behaviour.
- Do not introduce speculative infrastructure to make future changes easier.
- Keep documentation consistent with implemented behaviour.

When a proposed change would materially expand the architecture or public API, explain the trade-off before implementing it.

## Source of truth

The specifications under `docs/specs/` capture durable product and architectural intent.

Implementation plans are temporary and must not silently redefine that intent.

If implementation and specification disagree, identify and resolve the discrepancy rather than assuming either is automatically correct.