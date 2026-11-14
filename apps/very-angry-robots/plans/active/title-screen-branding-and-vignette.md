# Very Angry Robots title screen branding and vignette

**Status:** Active

## Objective

Update the Very Angry Robots Main Menu with prominent One More Glow branding,
a dominant game title and decorative vector imagery that evokes robot combat
and the room layout. Keep the start, navigation and settings prompts easy to
read.

## Durable references

- [High scores and attract screens](../../docs/specs/high-scores.md)
- [Core gameplay](../../docs/specs/gameplay.md)
- [Engineering principles](../../../../docs/engineering.md)
- [Asteroids title screen implementation](../../../asteroids-demo/src/main.ts)

## Scope

**In scope:**
- Redesign the Main Menu's title hierarchy and prompt placement.
- Add One More Glow branding and a decorative robot-and-room vector vignette.
- Keep the vignette independent of gameplay state and within the existing canvas.
- Review the title at narrow and wide canvas sizes and update the spec's
  implementation status after the change.

**Out of scope:**
- Changes to score flow, controls, game simulation or the Top Scores screen.
- New image assets, audio or shared rendering APIs.

## Decisions

- Use Asteroids' prominent brand, large game title and decorative vector
  vignette as a reference, adapted to robot and room imagery.
- Cycle the brand's GLOW word between pale cyan and amber; keep it still when
  reduced motion is preferred, matching Asteroids' title treatment.
- Draw the title treatment with the existing One More Glow drawing API. Keep
  the decorative elements static or subtly animated without advancing gameplay.
- Preserve the existing Main Menu prompts and settings access while arranging
  them around the title art.

## Work

- [x] Inspect current canvas coordinates, typography helpers and the Asteroids
  title vignette before laying out the new screen.
- [x] Draw prominent One More Glow branding and a dominant Very Angry Robots
  title with a clear visual hierarchy.
- [x] Animate the GLOW brand word with the Asteroids color cycle and respect
  reduced-motion preferences.
- [x] Add a decorative vector robot and recognizable room details, keeping the
  art clear of the title and prompts.
- [x] Reposition the start, Top Scores and Settings prompts so they remain
  readable at narrow and wide viewport sizes.
- [x] Update the high-scores spec's implementation and verification note.

## Verification

- Tests: Not run; this is a presentation-only change.
- Type checking and production build: Passed via
  `npm run build --workspace=very-angry-robots`.
- Manual visual review: The user supplied a wide-canvas screenshot, which
  confirms the title composition and prompt readability. Narrow viewport review
  remains outstanding; CUA reported no available browser surfaces.

## Open questions

- None currently.

## Next action

Inspect the branded title and vignette at narrow and wide viewport sizes when a
browser surface is available.

## Completion criteria

- [x] The Main Menu includes the accepted branding and decorative imagery
  requirements.
- [x] Start, Top Scores and Settings prompts are visually confirmed in the
  supplied wide-canvas screenshot.
- [ ] Review prompt readability at a narrow canvas size.
- [x] Type checking and production build results are recorded.
- [x] The high-scores spec accurately reflects implementation status.
