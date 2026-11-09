# One More Glow

One More Glow is a small TypeScript library for retro-inspired 2D vector
drawing. Its renderer-independent `DrawingContext` API currently has a WebGL2
renderer.

## Repository layout

- `packages/one-more-glow/` — reusable library package, including its public
  entry point and tests.
- [`apps/diagnostics/`](apps/diagnostics/README.md) — Vite consumer app for checking rendering with a test
  card and sample scene.
- [`apps/asteroids-demo/`](apps/asteroids-demo/README.md) — keyboard and gamepad controlled vector flight demo.
- [`apps/gyruss-demo/`](apps/gyruss-demo/README.md) — keyboard and gamepad controlled orbital shooter demo.
- `docs/specs/` — durable behavior requirements.

All consumer apps depend on the library by package name. Keep game or app
behavior in apps; place code in a shared package when a concrete reuse need appears. See
[`docs/architecture.md`](docs/architecture.md) for the dependency rules.

## Getting started

Requires Node.js and npm. From the repository root:

```sh
npm install
npm run dev
```

`npm run dev` starts the rendering diagnostics app. Use `?scene=testcard` for
the rendering test card, `?orientation=portrait` to check the portrait display,
or `?animate=1` to animate its sample scene. Run `npm run dev:asteroids` to
start the spacecraft flight demo or `npm run dev:gyruss` to play the orbital
shooter.

## Workspace commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build the library and start the diagnostics app. |
| `npm run dev:asteroids` | Build the library and start the flight demo. |
| `npm run dev:gyruss` | Build the library and start the orbital shooter demo. |
| `npm run check` | Build the library, then type-check all apps against its package API. |
| `npm run check:asteroids` | Build the library and type-check the flight demo. |
| `npm run check:gyruss` | Build the library and type-check the orbital shooter demo. |
| `npm test` | Run the library tests. |
| `npm run build` | Build the library and all production apps. |
| `npm run build:asteroids` | Build the library and production flight demo. |
| `npm run build:gyruss` | Build the library and production orbital shooter demo. |
| `npm run preview` | Preview the production diagnostics build. |
| `npm run preview:asteroids` | Preview the production flight demo. |
| `npm run preview:gyruss` | Preview the production orbital shooter. |

Each workspace has its own manifest and configuration. The root is private;
the library package is the independent package boundary. Library builds emit
JavaScript and TypeScript declarations into its ignored `dist/` directory.
