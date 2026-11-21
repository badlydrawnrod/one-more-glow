# CRT-inspired display effects

**Status: Proposed for consideration; not an implementation requirement.**

This document collects possible effects for the imaginary vector display. The
accepted behaviour and current implementation remain in the
[vector display specification](vector-display.md). The aim is to explore a
luminous visual character, not to commit to accurate hardware emulation.

## Starting point

The current renderer draws a sharp beam core and a coloured halo for each
stroke. The display profile controls core dimensions and halo strength and
spread. Overlapping strokes use the renderer's current alpha blending, and
the renderer does not model phosphor persistence or additive light
accumulation. The current beam width remains independent of intensity.

## Effects to consider

### Phosphor persistence

Illumination from previous frames could fade gradually after geometry moves or
disappears. A short decay could soften motion; a longer decay could produce
visible trails. Potential controls include an enable switch and decay time.
Colour-dependent decay and the interaction with frame timing remain open.

The existing display specification defers this effect and states that, if
introduced, it is optional and disabled by default. Clearing a frame's drawing
remains distinct from clearing any accumulated display illumination.

### Light accumulation

Crossing or repeatedly drawn strokes could contribute more illumination where
they overlap. Dense text could develop a stronger glow, and different colours
could interact at intersections. The response to repeated exposure, colour
mixing, saturation, drawing order and interaction with persistence remain open.
The existing display specification defers accumulation; ordinary alpha blending
is the current implementation baseline.

### Brightness-dependent bloom and focus

Brighter illumination could produce a stronger or broader halo. At more extreme
intensities, a softer or wider core could suggest a beam that becomes harder to
focus. The onset, strength and relationship to overdrive would need visual
evaluation. Any change to core width as intensity rises would require revisiting
the accepted distinction between beam width and intensity.

### Broad light spread

A faint, wide haze around bright geometry could complement the tighter halo,
evoking light spreading in and around a display. The existing glow spread
control already offers a stylised halo; whether a separate broad component
would improve the result, and how it would interact with intensity, remain open.

### Shadow masks and phosphor patterns

Some colour vector CRTs used a shadow mask to direct electron beams onto red,
green and blue phosphors. An optional display pattern could evoke their fine
dot or slot texture; an aperture-grille pattern is another possible colour CRT
appearance. These patterns can be considered independently of raster-style
scanlines and are not characteristics of every vector display.

Possible controls include pattern type, strength and scale. The default,
available patterns and relationship to the halo remain open. Evaluation should
consider whether the pattern makes thin lines too dark or produces distracting
artefacts at different output resolutions and display densities.

### Refresh and flicker

The display could suggest that a vector beam traces geometry over time: strokes
might fade between refreshes or complex scenes might flicker more visibly.
Whether timing should follow command order, how it should behave at different
frame rates, and whether the effect is desirable for gameplay remain open.

## Exploration priorities

Persistence and light accumulation are candidates to explore first, because
their effects would be visible in motion and at intersections. This is a
suggested order for consideration, not a commitment to implement either effect.
Any experiment should evaluate legibility and allow comparison with the current
appearance.

Vector displays draw paths rather than raster rows, so raster-style scanlines
are not a proposed starting point for these effects.
