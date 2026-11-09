# One More Glow

One More Glow is a small TypeScript library for retro-inspired 2D vector
drawing. Its renderer-independent `DrawingContext` API currently has a WebGL2
renderer.

## Repository layout

- `packages/one-more-glow/` — reusable library package, including its public
  entry point and tests.
- `apps/diagnostics/` — Vite consumer app for checking rendering with a test
  card and sample scene.
- `docs/specs/` — durable behavior requirements.

The diagnostics app depends on the library by package name. Keep game or app
behavior in apps; place code in a shared package when a concrete reuse need
appears. See [`docs/architecture.md`](docs/architecture.md) for the dependency
rules.

## Getting started

Requires Node.js and npm. From the repository root:

```sh
npm install
npm run dev
```

The diagnostics app provides the default sample scene. Add `?scene=testcard`
to the URL for the rendering test card, `?orientation=portrait` to check the
portrait display, or `?animate=1` to animate the sample scene.

## Workspace commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build the library and start the diagnostics app. |
| `npm run check` | Build the library, then type-check the app against its package API. |
| `npm test` | Run the library tests. |
| `npm run build` | Build the library and production diagnostics app. |
| `npm run preview` | Preview the production diagnostics build. |

Each workspace has its own manifest and configuration. The root is private;
the library package is the independent package boundary. Library builds emit
JavaScript and TypeScript declarations into its ignored `dist/` directory.
