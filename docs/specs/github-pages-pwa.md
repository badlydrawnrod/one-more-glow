# GitHub Pages multi-app PWA site

## Status and scope

**Status: Accepted.** The repository will publish a single GitHub Pages site
assembled from selected app workspaces. Its structure must support additional
apps being opted in later without changing the deployment model.

**Implementation: Implemented.** The Pages workflow, explicit app selection,
combined build, per-app manifests and scoped service workers are in place.
Project-path builds and static artifact contents have been verified. Browser
installation, offline launch and update behavior remain unverified.

The initial public site contains only:

- Very Angry Robots.
- The diagnostics app, presented as the Test Card app and opening on the Test
  Card view.

Asteroids and Gyruss are not part of the initial site. The Test Card app
includes all existing diagnostics views and controls, so visitors may switch
from the initial Test Card view to other diagnostics views. Discovering a
workspace under `apps/` must not publish it automatically.
The published apps retain their existing behavior as defined in the [Very
Angry Robots specification](../../apps/very-angry-robots/docs/specs/SPEC.md)
and the [diagnostics specification](../../apps/diagnostics/docs/specs/SPEC.md);
this document adds publication requirements and does not change their gameplay
or rendering contracts.

## Site layout

Publish one artifact for the repository's single Pages site. The artifact has a
small landing page and one path per published app:

| Route, relative to the Pages site base | Initial content |
| --- | --- |
| `/` | A site landing page linking only to Very Angry Robots and Test Card. |
| `/very-angry-robots/` | The Very Angry Robots app. |
| `/test-card/` | The diagnostics app, initially showing the Test Card. |

Paths are stable, lowercase, and end in `/`. The deployment must work when the
Pages site is served at a project path such as `/one-more-glow/`, as well as
from a domain root if the site later uses a custom domain. Asset, manifest,
navigation, and service-worker URLs must resolve under the configured site
base and app path; they must not assume the site is hosted at `/`.

The Test Card route must open directly on the Test Card. The diagnostics menu
and all existing diagnostics views remain available from that app. Its
published entry point uses the existing diagnostics implementation rather than
duplicating the renderer or test-card drawing code.

## Explicit publication selection

The deployment has an explicit list of apps to publish, separate from npm's
workspace discovery. Initially that list contains Very Angry Robots and the
diagnostics app under the Test Card name. Each entry identifies its
workspace/build target and its public route. Builds are staged into distinct
directories in one clean output directory before upload as a single Pages
artifact.

Adding another app later requires an explicit opt-in and the app's PWA/site
metadata, route, build output, and verification. It must not require replacing
the combined-site layout, creating a Pages repository per app, or changing
existing app URLs. An app remains unpublished until that opt-in is made.

## PWA behavior

Each published app is independently installable and owns its manifest and
service worker. Its manifest defines an app identity, icons, `start_url`,
`scope`, and standalone display mode. The start URL and scope are contained
within that app's route, including the configured Pages base. Each service
worker is served from that app's route and controls only that app's files; it
must not claim the landing page or another app. Manifests provide 192px and
512px icons for installability in Chromium-based browsers.

After one successful online visit, the installed app can launch and run without
a network connection. Cache the app shell and the local resources required for
the app to work, including Very Angry Robots' local audio assets. No server,
account, remote API, or network-backed game state is required. Updates must
replace cached assets without leaving the app on a mixed version of scripts and
content.

The apps share an origin on the combined site. App-owned browser storage must
use app-specific keys so one app cannot overwrite another app's preferences or
scores.

## Build and deployment

GitHub Actions builds the library and only the explicitly selected public app
targets, assembles the complete site artifact, and deploys it through GitHub
Pages. A deployment runs from the repository's default branch and can also be
triggered manually. The workflow runs the root checks, including repository
conventions, dependency boundaries, app type checks, and available behavioral
test suites, before it builds the artifact. Pull-request runs inspect the
artifact but must not publish it. Generated deployment output is not committed
as source.

The site build must not invoke the root all-app production build if that would
build unpublished workspaces unnecessarily. It may reuse the library build
required by published consumers. App-specific Vite base paths must be set from
the selected deployment route and Pages base.

## Verification scenarios

- The landing page lists only Very Angry Robots and Test Card.
- Both app routes load directly under the repository Pages path, including
  their scripts, styles, fonts, images, and other local assets.
- Test Card opens on the Test Card view, and its menu can switch to every
  existing diagnostics view.
- Each app has a valid manifest, correct app identity and icons, and a
  `start_url` and scope contained within its own route.
- Installing and launching either app opens the correct app, not the site root
  or the other app.
- Each service worker controls only its own app path. One app's update or
  offline cache does not replace the other's files.
- After a first online visit, both apps can launch and perform their core
  behavior offline. A later deployment updates them without a mixed-version
  shell.
- Apps not in the publication list are absent from the artifact and landing
  page.
- Adding a future app by explicit opt-in can add a new route while preserving
  the existing routes and service-worker scopes.

## Boundaries

GitHub Pages serves static files. Runtime functionality must not depend on a
server process or private credentials. The deployment workflow assembles and
publishes apps; it does not move app behavior or shared code into a new runtime
framework. Apps continue to depend on reusable packages through their public
package exports.

## References

- [GitHub Pages overview and limits](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [GitHub Pages deployment with Actions](https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically)
- [Vite static deployment and Pages base paths](https://vite.dev/guide/static-deploy#github-pages)
- [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [MDN: Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
