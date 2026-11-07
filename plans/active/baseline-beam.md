# Baseline beam visual slice

**Status:** In progress

## Objective

Implement and visually evaluate an initial baseline beam for Canvas 2D and WebGL2, guided by the proposed baseline criteria in `docs/specs/vector-display.md`.

## Durable references

- `docs/specs/vector-display.md` — proposed baseline beam criteria
- `docs/architecture.md` — renderer boundary and diagnostic consumer

## Scope

**In scope:**
- Make lines and points consistently visible as crisp, thin vector marks without bloom.
- Ensure connected segments do not show unintended gaps or conspicuous artifacts.
- Expand the diagnostic with deliberate baseline test patterns and intensity examples.
- Inspect Canvas and WebGL2 output visually and iterate once needed.

**Out of scope:**
- Bloom, persistence, additive compositing, configurable beam width, or public API changes.
- Promoting the proposed baseline to an accepted specification requirement before visual review.

## Decisions

- Keep exact beam width and endpoint/join style provisional; use visual results to guide them.
- Keep the Canvas and WebGL2 selection via `?renderer=canvas`.
- The initial implementation uses a 1.5-pixel rounded line and 1.5-pixel-radius point in both backends.

## Work

- [x] Add diagnostic patterns for lines, corners, endpoints, points and intensity.
- [x] Make initial renderer adjustments for a clear baseline and backend consistency.
- [x] Update implementation status in the spec without changing its proposed maturity.
- [x] Run relevant tests and build.
- [ ] Visually inspect both renderer modes and refine obvious artifacts.

## Verification

- Tests: `npm test` passed (6 tests).
- Type checking/build: `npm run build` passed.
- Diff whitespace check: `git diff --check` passed.
- Visual inspection: Not performed; no browser surface is available to the computer-use session.

## Open questions

- Which provisional line width and endpoint/join treatment looks right in browser feedback?

## Next action

Review `http://localhost:5174/` and `http://localhost:5174/?renderer=canvas`, then refine any visible artifacts.

## Completion criteria

- [ ] Both backends show crisp lines and points with distinct intensity levels.
- [ ] Diagnostic patterns reveal line joins, endpoints and point appearance.
- [ ] No obvious unintended gaps or rendering artifacts remain in the inspected pattern.
- [ ] Tests and production build pass.
- [ ] Spec records implementation status while keeping the baseline proposed.
