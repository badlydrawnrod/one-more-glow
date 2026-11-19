# One More Glow

One More Glow is a TypeScript project for retro-inspired 2D vector graphics.
It includes a renderer-independent drawing library with a WebGL2 backend and
interactive demo apps built on that library.

## Repository layout

- `packages/one-more-glow/` — reusable library package, including its public
  entry point and tests.
- [`apps/diagnostics/`](apps/diagnostics/README.md) — Vite workbench for canvas
  sizing and renderer studies.
- [`apps/asteroids-demo/`](apps/asteroids-demo/README.md) — keyboard and gamepad controlled Asteroids arcade game.
- [`apps/gyruss-demo/`](apps/gyruss-demo/README.md) — keyboard and gamepad controlled orbital shooter demo.
- [`apps/very-angry-robots/`](apps/very-angry-robots/README.md) — vector robot combat across connected rooms.
- `packages/one-more-glow/docs/specs/` — library behavior requirements.

All consumer apps depend on the library by package name. Keep game or app
behavior in apps; place code in a shared package when a concrete reuse need appears. See
[`docs/architecture.md`](docs/architecture.md) for the dependency rules.

## Repository skills

The repository includes focused skills for API, architecture, complexity and
correctness reviews, and for adding automated safeguards. See the
[`skills catalog`](docs/skills.md) for descriptions and instructions.

## Getting started

Requires Node.js and npm. From the repository root:

```sh
npm install
npm run dev
```

`npm run dev` starts the diagnostics workbench on **Canvas & Environment**.
Use its two screens to inspect canvas sizing or open a renderer study. The
existing `?scene=testcard`, `?scene=segments`, `?scene=spacing`, and
`?scene=profile` links remain available; `?orientation=portrait` and
`?animate=1` continue to open the game study. Run `npm run dev:asteroids` to
play Asteroids or `npm run dev:gyruss` to play the orbital shooter.
Run `npm run dev:robots` to play Very Angry Robots.

## Workspace commands

Run these from the repository root:
Repository checks belong in `tools/`, and every root npm command is listed here.
`npm run check` verifies both conventions.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build the library and start the diagnostics app. |
| `npm run dev:asteroids` | Build the library and start Asteroids. |
| `npm run dev:gyruss` | Build the library and start the orbital shooter demo. |
| `npm run dev:robots` | Build the library and start Very Angry Robots. |
| `npm run check` | Build the library, then type-check all apps against its package API. |
| `npm run check:repo-conventions` | Check that root npm commands are listed here and repository-check scripts live in `tools/`. |
| `npm run check:boundaries` | Check that apps import the library through its public entry point and do not depend on other apps. |
| `npm run check:asteroids` | Build the library and type-check the Asteroids app. |
| `npm run check:gyruss` | Build the library and type-check the orbital shooter demo. |
| `npm run check:robots` | Build the library and type-check Very Angry Robots. |
| `npm test` | Run the library tests. |
| `npm run test --workspace=asteroids-demo` | Run the Asteroids simulation and input tests. |
| `npm run test --workspace=very-angry-robots` | Run the Very Angry Robots tests. |
| `npm run build` | Build the library and all production apps. |
| `npm run build:asteroids` | Build the library and production Asteroids app. |
| `npm run build:gyruss` | Build the library and production orbital shooter demo. |
| `npm run build:robots` | Build the library and production Very Angry Robots app. |
| `npm run preview` | Preview the production diagnostics build. |
| `npm run preview:asteroids` | Preview the production Asteroids app. |
| `npm run preview:gyruss` | Preview the production orbital shooter. |
| `npm run preview:robots` | Preview the production Very Angry Robots app. |
| `npm run build:pages` | Build and assemble the explicitly selected GitHub Pages apps into `.pages-output/`. |

Each workspace has its own manifest and configuration. The root is private;
the library package is the independent package boundary. Library builds emit
JavaScript and TypeScript declarations into its ignored `dist/` directory.

## GitHub Pages site

The combined Pages site publishes the landing page, Very Angry Robots at
`/very-angry-robots/`, and diagnostics as Test Card at `/test-card/`. The
publication allowlist is maintained in `tools/pages-publication.mjs`; adding a
workspace to npm does not publish it. A future app needs an explicit entry
there and app-owned route/PWA assets before it is included.

Build and preview the assembled site locally from the repository root:

```sh
PAGES_BASE=/ npm run build:pages
npm exec vite -- preview --outDir .pages-output
```

Open the preview URL's `/`, `/very-angry-robots/`, and `/test-card/` paths.
`PAGES_BASE` defaults to `/`. The Pages workflow sets it to the repository
project path (for example `/one-more-glow/`); set the repository Actions
variable `PAGES_BASE` to `/` when publishing at a custom domain root. Each app
build also receives its own `APP_ROUTE`, and its Vite base combines that route
with `PAGES_BASE`.

Before the first deployment, set the repository's Pages publishing source to
**GitHub Actions** in Settings → Pages.

Pull requests build and upload an artifact for validation only. Pushes to the
default branch deploy automatically. A manual workflow run deploys the branch
selected for that run.

## Display profile

The renderer exposes a global profile separately from drawing commands. Supply
a complete profile to change it for the next frame:

```ts
import { createWebGL2Renderer, DEFAULT_DISPLAY_PROFILE } from "one-more-glow";

const renderer = createWebGL2Renderer(webglContext);
renderer.setDisplayProfile({ ...DEFAULT_DISPLAY_PROFILE, glowStrength: 0.5 });
```

The profile controls line width, point radius, glow strength and glow spread.
See the [display specification](packages/one-more-glow/docs/specs/SPEC.md) for ranges and
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
[segment text specification](packages/one-more-glow/docs/specs/segment-text.md) for coverage and behavior.
