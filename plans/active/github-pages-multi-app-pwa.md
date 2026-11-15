# GitHub Pages multi-app PWA site

**Status:** In progress

## Objective

Publish a single GitHub Pages site assembled from explicitly selected app
workspaces. Launch with Very Angry Robots and the diagnostics app presented as
the Test Card app, while keeping the site structure ready for later app
opt-ins.

## Durable references

- [GitHub Pages multi-app PWA specification](../../docs/specs/github-pages-pwa.md)
- [Repository architecture](../../docs/architecture.md)
- [Diagnostics specification](../../apps/diagnostics/docs/specs/SPEC.md)
- [Very Angry Robots specification](../../apps/very-angry-robots/docs/specs/SPEC.md)
- [Plans guidance](../README.md)

## Scope

**In scope:**
- A Pages landing page and stable paths for Very Angry Robots and Test Card.
- An explicit publication list and a clean, combined deployment artifact.
- A Test Card entry point that opens on the Test Card and retains all
  diagnostics views.
- Per-app PWA manifests and service workers, app-path isolation, offline launch,
  and update behavior.
- GitHub Actions build, pull-request validation, and default-branch deployment.
- Verification under a repository project path and app-specific storage keys.

**Out of scope:**
- Publishing Asteroids or Gyruss as separate apps.
- Deploying an independent Pages site or repository for every app.
- Adding backend services, user accounts, or network-backed game state.
- Changing game mechanics or the shared drawing API.

## Decisions

- Publish one Pages artifact with `/`, `/very-angry-robots/`, and `/test-card/`
  routes relative to the configured Pages site base.
- Keep publication opt-in; workspace discovery alone does not add a public app.
- Reuse the diagnostics implementation for Test Card instead of duplicating it.
- Give each published app its own manifest and service-worker scope.
- Combine `PAGES_BASE` with each explicit `APP_ROUTE` for Vite asset URLs.
- Stamp each service-worker cache version from its built app artifact so a new
  app build installs as a separate cache before the prior cache is removed.

## Work

- [x] Inspect existing Vite build outputs, diagnostics view selection, app storage,
  and local assets; determine how the published diagnostics app opens on the
  Test Card while retaining all views.
- [x] Add the combined landing page and stage each selected app at its stable
  route with a configurable Pages base path.
- [x] Add PWA manifests, icons, scoped service workers, offline app-shell
  resources, and an update policy for both published targets.
- [x] Add an explicit publication configuration and GitHub Actions workflow for
  PR validation, default-branch deployment, and manual deployment.
- [x] Update practical docs with published URLs, local preview steps, and the
  process for opting another app into publication.
- [ ] Verify route assets, all diagnostics views, manifest/install behavior,
  service-worker isolation, offline operation, and deployment updates.

## Verification

- Robots tests: Passed (114 tests)
- Type checking and repository checks: Passed (`npm run check`)
- Pages build: Passed with `PAGES_BASE=/one-more-glow/` and `/`
- Artifact checks: Passed for selected routes, base-prefixed assets, manifests,
  icons, worker scopes/version markers, and robots audio assets
- Browser/PWA checks: Not run; no browser was available through the UI tools

Record actual results here as implementation proceeds.

## Open questions

- Browser-level installation, offline launch, scene navigation and update checks
  remain to be run in a browser-enabled environment.

## Next action

Run browser-level PWA checks against the combined preview under a project base
path: install both apps, check service-worker scope isolation, launch offline,
and confirm an updated deployment replaces the previous cached app version.

## Completion criteria

- [x] One Pages artifact contains only the landing page, Very Angry Robots, and
  the diagnostics app published as Test Card, with all its current views.
- [ ] Both PWAs install, launch, and run offline under their own route and
  service-worker scope, including when hosted below the repository base path.
- [x] A future app can be published by explicit opt-in without changing current
  routes or automatically publishing other workspaces.
- [x] The workflow deploys only the default branch (or an explicit manual run),
  validates pull requests without publishing, and all relevant checks pass.
- [ ] Durable docs reflect implementation and verification; remove this plan
  after browser-level verification is complete.
