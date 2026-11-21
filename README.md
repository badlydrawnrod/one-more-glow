# One More Glow

One More Glow is a TypeScript library for drawing retro-style 2D vector
graphics. Try the browser demos to see what it can draw and check how the
graphics look on your display.

[Try an app online](#try-an-app-online) ·
[Run an app locally](#run-an-app-locally) ·
[Ask for a change](#ask-for-a-change) ·
[Use the drawing library](#use-the-drawing-library)

## Try an app online

- [Play Very Angry Robots](https://badlydrawnrod.github.io/one-more-glow/very-angry-robots/)
  and fight robots as you move through connected rooms.
- [Open Test Card](https://badlydrawnrod.github.io/one-more-glow/test-card/)
  to see how the renderer draws lines, curves, and bright points. Switch to
  **Canvas & Environment** to check sizing and clipping on your display.

## Run an app locally

Use Node.js 22.12 or later with npm. In a local checkout, open a terminal in
the folder containing this README and run these commands.

```sh
npm install
npm run dev
```

Open the local URL printed in the terminal. The diagnostics app opens on
**Canvas & Environment**. To see the Test Card, open **Renderer & Performance**
and select **Test card**. See the [diagnostics guide](apps/diagnostics/README.md)
for links that open each study directly.

To start a game, run its command from the same folder and open the URL it prints.

| Game | Command |
| --- | --- |
| [Asteroids](apps/asteroids-demo/README.md) | `npm run dev:asteroids` |
| [Gyruss](apps/gyruss-demo/README.md) | `npm run dev:gyruss` |
| [Very Angry Robots](apps/very-angry-robots/README.md) | `npm run dev:robots` |

## Ask for a change

Start a Codex chat or [open a GitHub issue](https://github.com/badlydrawnrod/one-more-glow/issues/new).
Describe in your own words what you’re trying to do and what you’d see or be
able to do if it worked.

> When part of the diagnostics test card disappears, I want to know whether
> scrolling will reveal it or whether the test area is clipping it. I’d like
> to try both cases and see the right explanation on-screen and in the copied
> report.

| If you’re starting with… | What to ask for | What you can expect |
| --- | --- | --- |
| Something broken | Say what you expected and what happened. Include steps to reproduce if you have them. | A verified fix or an explanation of what’s blocking it. |
| A clear improvement | Describe the outcome you want and give an example of success. | A checked change, with lasting behavior recorded in the spec where it matters. |
| A sense that something is off | Ask for a review and describe where it feels confusing or falls short. | Findings and options you can use to decide what to change. |
| An idea for a new app | Say who it’s for and what they should be able to do in the first version. Mention if you also want to [publish it](#publish-an-app). | An app you can run locally, with instructions for trying the first scenario. |

See [work and documentation](docs/engineering.md#work-and-documentation) for
how changes are planned, checked, and documented. The
[skills catalog](docs/skills.md) lists focused reviews and automated safeguards.

## Use the drawing library

Import drawing types and helpers from `one-more-glow`. Write drawing code
against `DrawingContext` and use the WebGL2 renderer to display the result
in a browser. See the [vector display specification](packages/one-more-glow/docs/specs/SPEC.md)
for the drawing API and its behavior.

### Adjust the display profile

Create the renderer with an existing WebGL2 context. Pass a complete display
profile to change settings for the next frame. This example reduces the glow
strength while keeping the other default settings.

```ts
import { createWebGL2Renderer, DEFAULT_DISPLAY_PROFILE } from "one-more-glow";

const renderer = createWebGL2Renderer(webglContext);
renderer.setDisplayProfile({ ...DEFAULT_DISPLAY_PROFILE, glowStrength: 0.5 });
```

The profile controls line width, point radius, glow strength, and glow spread.
Try the settings in the diagnostics app's **Display profile** study.

### Draw and measure segment text

Pass an existing `DrawingContext` as `drawing`.

```ts
import { drawText, measureText } from "one-more-glow";

const options = { font: "segment22", height: 24, spacing: "kerned" } as const;
const metrics = measureText("Player 1", options);
drawText(drawing, "Player 1", 0, 0, options);
```

The `x` and `y` arguments give the start of the baseline in logical coordinates.
`height` sets the height of uppercase letters. Add `metrics.ascent` and
`metrics.descent` for the full nominal font height. `metrics.width` gives the
distance from the start of the text to where the next character would start,
including trailing spaces.
Use `segment16` for the uppercase design, which converts ASCII lowercase
letters automatically. Spacing is fixed by default. See the
[segment text specification](packages/one-more-glow/docs/specs/segment-text.md)
for character coverage and layout rules.

## Publish an app

The [GitHub Pages site](https://badlydrawnrod.github.io/one-more-glow/) hosts
Very Angry Robots and Test Card. To publish another app, add it to
[`tools/pages-publication.mjs`](tools/pages-publication.mjs) and give it a
public route, a web app manifest, and a service worker. See the
[publication requirements](docs/specs/github-pages-pwa.md) for the assets and
checks each app needs.

### Preview the site locally

Build the site from the repository root, then start the preview server.

```sh
PAGES_BASE=/ npm run build:pages
npm exec vite -- preview --outDir .pages-output
```

Open the URL printed in the terminal. The landing page links to Very Angry
Robots and Test Card. Open both links to check that the apps load.

### Deploy the site

Before the first deployment, select **GitHub Actions** under **Settings → Pages**
in the repository. Pushes to the default branch deploy automatically. To
deploy a specific branch, select it in a manual workflow run. Pull requests
build and upload the site for validation.

The Pages workflow uses the repository path as `PAGES_BASE`, for example
`/one-more-glow/`. To publish at the root of a custom domain, set the
repository Actions variable `PAGES_BASE` to `/`. Each app's Vite base combines
this path with its `APP_ROUTE`.

## Workspace commands

Run these commands from the repository root.

### Run and preview

| Command | Purpose |
| --- | --- |
| `npm run dev` | Build the library and start diagnostics. |
| `npm run dev:asteroids` | Build the library and start Asteroids. |
| `npm run dev:gyruss` | Build the library and start Gyruss. |
| `npm run dev:robots` | Build the library and start Very Angry Robots. |
| `npm run preview` | Preview the production diagnostics build. |
| `npm run preview:asteroids` | Preview the production Asteroids build. |
| `npm run preview:gyruss` | Preview the production Gyruss build. |
| `npm run preview:robots` | Preview the production Very Angry Robots build. |

### Check and test

| Command | Purpose |
| --- | --- |
| `npm run check` | Check repository conventions and app dependencies, build the library, type-check all apps, and run all behavioral tests. |
| `npm run check:repo-conventions` | Check the README command list, skills catalog, and placement of check scripts in `tools/`. |
| `npm run check:boundaries` | Check that apps import the library through its public entry point and avoid dependencies on other apps. |
| `npm run check:asteroids` | Build the library and type-check Asteroids. |
| `npm run check:gyruss` | Build the library and type-check Gyruss. |
| `npm run check:robots` | Build the library and type-check Very Angry Robots. |
| `npm test` | Run behavioral tests for the library and apps that have test suites. |
| `npm run test --workspace=diagnostics` | Run the diagnostics sizing and frame-timing tests. |
| `npm run test --workspace=asteroids-demo` | Run the Asteroids simulation and input tests. |
| `npm run test --workspace=very-angry-robots` | Run the Very Angry Robots tests. |

### Build

| Command | Purpose |
| --- | --- |
| `npm run build` | Build the library and all production apps. |
| `npm run build:asteroids` | Build the library and production Asteroids app. |
| `npm run build:gyruss` | Build the library and production Gyruss app. |
| `npm run build:robots` | Build the library and production Very Angry Robots app. |
| `npm run build:pages` | Build the apps selected for GitHub Pages and assemble the site in `.pages-output/`. |

## Repository layout

- [`apps/`](apps/) contains the demos and the diagnostics app. Each app owns
  its behavior and imports the library by package name.
- [`packages/one-more-glow/`](packages/one-more-glow/) contains the reusable
  library, its tests, and its specifications. The library build writes
  JavaScript and TypeScript declarations to `packages/one-more-glow/dist/`.
- [Repository architecture](docs/architecture.md) explains which parts of the
  repository own each responsibility and how they depend on one another.
