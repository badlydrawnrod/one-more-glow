# Agent instructions

One More Glow is a TypeScript workspace for retro-inspired vector graphics,
with reusable packages under `packages/` and demo apps under `apps/`. The
current drawing package's WebGL2 renderer implements the renderer-independent
`DrawingContext`; preserve that boundary so future renderers can serve the
same consumers.

## Read what applies

- Read `docs/engineering.md` for engineering conventions and the specification lifecycle.
- Read `docs/architecture.md` when a change touches module boundaries, dependencies or repository layout.
- When working on a package, read its `docs/specs/SPEC.md` index if present, then the relevant capability specs it links.
- When working on an app, read its `docs/specs/SPEC.md` index if present, then the relevant app capability specs it links.
- For substantial work, follow `plans/README.md` and inspect relevant root and app-local active plans.
- Use `README.md` for workspace commands.

Do not implement proposed or deferred capabilities as if they were accepted requirements.

Before adding persistent guidance, check whether an existing authoritative document can be clarified or consolidated. Add a rule only when it captures a repository-specific decision that existing guidance and checks do not already cover.
