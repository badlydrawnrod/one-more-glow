# One More Glow

One More Glow is a small TypeScript library for retro-inspired 2D vector
drawing. Its renderer-independent `DrawingContext` API currently has a WebGL2
renderer.

## Repository layout

- `packages/one-more-glow/` — reusable library package, including its public
  entry point and tests.
- [`apps/diagnostics/`](apps/diagnostics/README.md) — Vite consumer app for checking rendering with a test
  card and sample scene.
- [`apps/asteroids-demo/`](apps/asteroids-demo/README.md) — keyboard and gamepad controlled Asteroids arcade game.
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
play Asteroids or `npm run dev:gyruss` to play the orbital shooter.

## Workspace commands

Run these from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build the library and start the diagnostics app. |
| `npm run dev:asteroids` | Build the library and start Asteroids. |
| `npm run dev:gyruss` | Build the library and start the orbital shooter demo. |
| `npm run check` | Build the library, then type-check all apps against its package API. |
| `npm run check:asteroids` | Build the library and type-check the Asteroids app. |
| `npm run check:gyruss` | Build the library and type-check the orbital shooter demo. |
| `npm test` | Run the library tests. |
| `npm run test --workspace=asteroids-demo` | Run the Asteroids simulation and input tests. |
| `npm run build` | Build the library and all production apps. |
| `npm run build:asteroids` | Build the library and production Asteroids app. |
| `npm run build:gyruss` | Build the library and production orbital shooter demo. |
| `npm run preview` | Preview the production diagnostics build. |
| `npm run preview:asteroids` | Preview the production Asteroids app. |
| `npm run preview:gyruss` | Preview the production orbital shooter. |

Each workspace has its own manifest and configuration. The root is private;
the library package is the independent package boundary. Library builds emit
JavaScript and TypeScript declarations into its ignored `dist/` directory.

## Display profile

The renderer exposes a global profile separately from drawing commands. Supply
a complete profile to change it for the next frame:

```ts
import { createWebGL2Renderer, DEFAULT_DISPLAY_PROFILE } from "one-more-glow";

const renderer = createWebGL2Renderer(webglContext);
renderer.setDisplayProfile({ ...DEFAULT_DISPLAY_PROFILE, glowStrength: 0.5 });
```

The profile controls line width, point radius, glow strength and glow spread.
See the [display specification](docs/specs/vector-display.md) for ranges and
update semantics. The diagnostics app's Profile view allows live adjustment.

## Segment text

Use the renderer-independent text helpers with an existing drawing context:

```ts
import { drawText, measureText } from "one-more-glow";

const options = { font: "segment22", height: 24, spacing: "kerned" } as const;
const metrics = measureText("Player 1", options);
drawText(drawing, "Player 1", 0, 0, options);
```

The position is the start of the baseline in logical coordinates. `height` is
uppercase height; `metrics.ascent + metrics.descent` gives the full nominal
font height. `metrics.width` is the advance to the next character, including
trailing spaces. Choose `segment16` for the uppercase design; ASCII lowercase
is converted automatically. Fixed spacing is the default. See the
[segment text specification](docs/specs/segment-text.md) for coverage and behavior.
