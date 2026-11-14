# Very Angry Robots title screen branding and vignette

**Status:** Active

## Objective

Give the Very Angry Robots Main Menu and Top Scores screen prominent One More
Glow branding and the game title. Keep the dominant game title and gameplay
vignette on the Main Menu, and keep the score table and navigation prompts easy
to read.

## Durable references

- [High scores and attract screens](../../docs/specs/high-scores.md)
- [Core gameplay](../../docs/specs/gameplay.md)
- [Engineering principles](../../../../docs/engineering.md)
- [Asteroids title screen implementation](../../../asteroids-demo/src/main.ts)

## Scope

**In scope:**
- Redesign the Main Menu's title hierarchy and prompt placement.
- Add One More Glow branding and a gameplay-focused vector vignette.
- Add the same animated brand treatment above the Top Scores heading.
- Add the Very Angry Robots title below the brand on Top Scores at the same size
  as the Main Menu title, moving the score content down to preserve spacing.
- Make the vignette representative of gameplay by depicting the player firing
  at hostile robots in a maze-like room, using more of the available title
  space.
- Keep the vignette independent of gameplay state and within the existing canvas.
- Review the title at narrow and wide canvas sizes and update the spec's
  implementation status after the change.

**Out of scope:**
- Changes to score flow, controls or game simulation.
- New image assets, audio or shared rendering APIs.

## Decisions

- Use Asteroids' prominent brand, large game title and decorative vector
  vignette as a reference, adapted to robot and room imagery.
- Cycle the brand's GLOW word between pale cyan and amber; keep it still when
  reduced motion is preferred, matching Asteroids' title treatment.
- Draw the title treatment with the existing One More Glow drawing API. Keep
  the decorative elements static or subtly animated without advancing gameplay.
- Show the player, hostile robots, shots, internal maze walls and a doorway in
  the vignette, using silhouettes and colors consistent with gameplay.
- Use the game's room proportions and double-outline maze walls, and leave the
  HUD out of the vignette.
- Preserve the existing Main Menu prompts and settings access while arranging
  them around the title art.

## Work

- [x] Inspect current canvas coordinates, typography helpers and the Asteroids
  title vignette before laying out the new screen.
- [x] Draw prominent One More Glow branding and a dominant Very Angry Robots
  title with a clear visual hierarchy.
- [x] Animate the GLOW brand word with the Asteroids color cycle and respect
  reduced-motion preferences.
- [x] Reuse the animated brand above the Top Scores table.
- [x] Add the game title below the brand on Top Scores.
- [x] Match the Top Scores game title size to the Main Menu and move the score
  table and prompts down to make room.
- [x] Align the bottom prompt baselines across Main Menu and Top Scores.
- [x] Add a decorative vector robot and recognizable room details, keeping the
  art clear of the title and prompts.
- [x] Replace the posed robot display with a representative combat scene.
- [x] Expand the vignette with several robots and return fire; use the actual
  room and maze geometry without a HUD.
- [x] Keep the vignette robots at a consistent scale.
- [x] Use red for the vignette robots.
- [x] Reposition the start, Top Scores and Settings prompts so they remain
  readable at narrow and wide viewport sizes.
- [x] Update the high-scores spec's implementation and verification note.

## Verification

- Tests: Not run; this is a presentation-only change.
- Type checking and production build: Passed via
  `npm run build --workspace=very-angry-robots`, including the revised combat
  vignette.
- Manual visual review: The user supplied wide-canvas screenshots confirming
  the earlier combat vignette and prompt readability. The updated room geometry,
  resized Top Scores title and its spacing, and narrow viewport review remain
  outstanding; CUA reported no available browser surfaces.

## Open questions

- None currently.

## Next action

Inspect the updated room vignette and Top Scores spacing at a wide viewport,
then check prompt readability at a narrow viewport when a browser surface is
available.

## Completion criteria

- [x] The Main Menu includes the accepted branding and decorative imagery
  requirements.
- [x] The vignette depicts combat in a maze-like room.
- [ ] Review the double-outline gameplay vignette at a wide canvas size.
- [x] Start, Top Scores and Settings prompts are visually confirmed in the
  supplied wide-canvas screenshot.
- [ ] Review prompt readability at a narrow canvas size.
- [x] Review the revised combat vignette at a wide canvas size.
- [ ] Review Top Scores brand and table spacing at a wide canvas size.
- [ ] Review the added game title on Top Scores at a wide canvas size.
- [x] Type checking and production build results are recorded.
- [x] The high-scores spec accurately reflects implementation status.
