# Derived Geometry Specification

This specification defines convenience geometry built from the fundamental drawing operations in the vector-display specification.

## Purpose

**Status: Accepted**

Derived geometry makes common connected outlines easier to submit while preserving the small immediate-mode drawing contract. It does not introduce new rendering primitives or renderer-specific behavior.

## Open polylines and polygon outlines

**Status: Accepted**
**Implementation: Implemented**

Provide two helpers that operate on a `DrawingContext` and a sequence of 2D points:

- `drawPolyline(drawing, points)` moves to the first point and draws line segments through each following point. It leaves the path open.
- `drawPolygonOutline(drawing, points)` draws the same sequence and adds a final segment back to the first point.

The point type is an immutable pair of logical `x` and `y` coordinates. Coordinates may be fractional and use the logical coordinate system selected for the renderer.

Both helpers use the existing `moveTo` and `lineTo` operations. Current colour, intensity, beam profile, drawing order and renderer behavior therefore apply as they do to individually submitted lines. The helpers do not add drawing state or renderer commands.

Inputs with fewer than two points for a polyline, or fewer than three points for a polygon outline, produce no drawing operations. Repeated points and self-intersections are passed through as supplied; helpers do not validate or alter geometry.

The helpers belong in a renderer-independent geometry module and are exported through the public library entry point. They are utilities, not methods on `DrawingContext`.

## Circles and ellipses

**Status: Accepted**
**Implementation: Implemented**

Add `drawCircle(drawing, center, radius)` and `drawEllipse(drawing, center, radiusX, radiusY)` helpers. A circle is a common operation in its own right, even though it can also be expressed as an ellipse with equal radii.

Both helpers approximate the curve with line segments and submit the result as a closed outline. The generated geometry uses the same colour, intensity, beam profile and ordering semantics as other line-based outlines.

Choose the segment count from a maximum chord error of 0.5 logical coordinate units. For a circle of radius `r`, use:

```text
segments = ceil(π / acos(1 - 0.5 / r))
```

Use at least 12 segments. For an ellipse, apply the same calculation using the larger of `radiusX` and `radiusY`; this conservatively bounds the deviation for the ellipse. The number of segments is an internal implementation detail, not a caller option. This rule gives a deterministic approximation in logical units without coupling geometry helpers to renderer or canvas sizing.

If the circle radius is zero or negative, the helper produces no drawing operations. If either ellipse radius is zero or negative, the helper also produces no drawing operations. Invalid drawing dimensions do not throw.

## Arcs

**Status: Deferred**
**Implementation: Not implemented**

Arc helpers are deferred. Their coordinate convention, direction, angle units, treatment of full circles, and endpoint behavior should be decided when a concrete use case is taken up. Circular and elliptical arcs may be considered then.

## Out of scope

- Filled polygons
- Curves other than the accepted circle and ellipse outlines
- Geometry validation, simplification or clipping beyond renderer surface clipping
- New renderer contract operations

Other derived geometry may be considered separately when a concrete consumer need arises.
